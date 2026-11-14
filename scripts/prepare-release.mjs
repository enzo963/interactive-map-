import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';
import { build, loadEnv } from 'vite';
import { buildSeo } from './build-seo.mjs';
import { publicOrigin } from '../src/seo/metadata.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
assert.match(version, /^1\.0\.0-rc\.\d+$/, 'Only local Version 1.0 candidates may be prepared by this command.');
const siteUrl = publicOrigin(process.env.VITE_SITE_URL ?? loadEnv('production', root, 'VITE_').VITE_SITE_URL ?? '');
const candidate = join(root, '.release', `v${version}`);
await mkdir(join(root, '.release'), { recursive: true });
// Deliberately refuse reuse: an earlier candidate must remain rollback-ready.
await mkdir(candidate);
const site = join(candidate, 'site');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
async function inventory(dir) {
  const entries = [];
  for (const path of (await readdir(dir, { recursive: true })).sort()) {
    const file = join(dir, path);
    if (!(await stat(file)).isFile()) continue;
    const data = await readFile(file);
    entries.push({ path: path.replaceAll('\\', '/'), bytes: data.length, sha256: sha256(data) });
  }
  return entries;
}
function zipDirectory(source, target) {
  // Pass paths as environment values, never interpolate them into shell code.
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($env:HB_ZIP_SOURCE, $env:HB_ZIP_TARGET, [System.IO.Compression.CompressionLevel]::Optimal, $false)"],
  { env: { ...process.env, HB_ZIP_SOURCE: source, HB_ZIP_TARGET: target }, stdio: 'pipe' });
}
const rawBytes = await readFile(join(root, 'src/data/sites.json'));
const records = JSON.parse(rawBytes);
const approved = records.filter((record) => record.status === 'approved');
assert.ok(approved.length > 0, 'A release needs approved records.');
assert.equal(new Set(approved.map((record) => record.id)).size, approved.length, 'Approved IDs must be unique.');
const snapshot = `${JSON.stringify(approved, null, 2)}\n`;
const previous = process.env.HB_RELEASE_APPROVED_ONLY;
try {
  process.env.HB_RELEASE_APPROVED_ONLY = '1';
  await build({ root, build: { outDir: site, emptyOutDir: false },
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl) } });
  const seo = await buildSeo({ outDir: site, siteUrl, approvedOnly: true });
  const js = (await inventory(site)).filter((file) => file.path.endsWith('.js'));
  const dataModules = await Promise.all(js.filter((file) => /\/sites-/.test(file.path)).map((file) => import(pathToFileURL(join(site, file.path)).href)));
  const bundledIds = new Set(dataModules.flatMap((module) => Object.values(module).filter(Array.isArray).flat()).map((record) => record.id));
  assert.equal(bundledIds.size, approved.length, 'Built records match the approved snapshot count.');
  for (const record of records) {
    assert.equal(bundledIds.has(record.id), record.status === 'approved', `${record.id}: candidate approval boundary`);
  }
  const detailFiles = (await inventory(site)).filter((file) => /^sites\/[^/]+\.html$/.test(file.path));
  assert.equal(detailFiles.length, approved.length, 'Every approved record needs an initial HTML head.');
  for (const record of approved) assert.ok(detailFiles.some((file) => file.path === `sites/${encodeURIComponent(record.slug)}.html`), record.slug);
  assert.equal(await readFile(join(root, 'src/data/sites.json'), 'utf8'), rawBytes.toString(), 'Packaging cannot change research data.');
  await writeFile(join(candidate, 'approved-sites.json'), snapshot);
  const source = join(candidate, 'private-source');
  await mkdir(source);
  for (const directory of ['src', 'public', 'scripts', 'vite', 'tests', 'docs']) {
    for (const entry of await inventory(join(root, directory))) {
      const target = join(source, directory, entry.path);
      await mkdir(join(target, '..'), { recursive: true });
      await copyFile(join(root, directory, entry.path), target);
    }
  }
  for (const file of ['package.json', 'package-lock.json', 'vite.config.js', 'eslint.config.js', 'index.html', '.gitignore', '.env.example', 'README.md']) await copyFile(join(root, file), join(source, file));
  const identityDecisions = 'tools/content-pipeline/data/site-identity-decisions.json';
  await mkdir(join(source, 'tools/content-pipeline/data'), { recursive: true });
  await copyFile(join(root, identityDecisions), join(source, identityDecisions));
  const buildFiles = await inventory(site);
  const sourceFiles = await inventory(source);
  const deployZip = `history-in-cards-v${version}-static.zip`;
  const sourceZip = `history-in-cards-v${version}-PRIVATE-source.zip`;
  zipDirectory(site, join(candidate, deployZip));
  zipDirectory(source, join(candidate, sourceZip));
  const manifest = {
    version, preparedAt: new Date().toISOString(), status: 'local-release-candidate',
    deployment: { status: 'pending-hosting-and-domain', publicOrigin: siteUrl || null, liveHttpsVerified: false },
    source: { gitBase: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      workingTreeSnapshot: sourceZip, researchSha256: sha256(rawBytes), files: sourceFiles },
    dataset: { policy: 'approved-only', sourceRecords: records.length, publishedRecords: approved.length,
      snapshot: 'approved-sites.json', sha256: sha256(snapshot) },
    seo, buildFiles,
    archives: await Promise.all([deployZip, sourceZip].map(async (path) => ({ path, sha256: sha256(await readFile(join(candidate, path))) }))),
    limitations: ['Hosting, public domain, live HTTPS and routing remain unverified.', 'No stable Version 1.0 tag or public release has been created.', 'Private source contains unpublished research; upload only the static ZIP contents.'],
  };
  await writeFile(join(candidate, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await copyFile(join(root, 'docs/RELEASE.md'), join(candidate, 'RELEASE.md'));
  console.log(`Candidate prepared: ${relative(root, candidate)}\n${approved.length} approved records; ${buildFiles.length} static files. No public deployment performed.`);
} finally {
  if (previous === undefined) delete process.env.HB_RELEASE_APPROVED_ONLY;
  else process.env.HB_RELEASE_APPROVED_ONLY = previous;
}
