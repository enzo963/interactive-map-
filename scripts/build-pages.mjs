import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { build, loadEnv } from 'vite';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSeo } from './build-seo.mjs';
import { getGovernorateKey } from '../src/data/governorates.js';

const repo = process.env.GITHUB_REPOSITORY?.split('/').at(-1) ?? 'interactive-map-';
const base = repo.endsWith('.github.io') ? '/' : `/${repo}/`;
const outDir = resolve(process.env.HB_PAGES_OUT || 'dist');
await build({ base, build: { outDir } });

const dist = pathToFileURL(outDir + sep);
const index = new URL('index.html', dist);
const records = JSON.parse(await readFile(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const routes = new Set(['explore', 'map', 'decks', 'decks/unesco', 'decks/3d', 'unesco', '3d-archive', 'about', 'methodology', 'our-work', 'contact', 'decks/our-work']);
for (const site of records) {
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug)) routes.add(`sites/${site.slug}`);
  const governorate = getGovernorateKey(site.governorate);
  if (governorate) routes.add(`decks/${governorate}`);
}

// Pages serves directory indexes for direct visits and 404.html for unrecognized URLs.
const { VITE_SITE_URL } = loadEnv('production', process.cwd(), 'VITE_');
await buildSeo({ outDir, directoryIndexes: true, base, siteUrl: process.env.VITE_SITE_URL ?? VITE_SITE_URL ?? '' });
await Promise.all([...routes].map(async (route) => {
  const directory = new URL(`${route}/`, dist);
  await mkdir(directory, { recursive: true });
  const page = new URL('index.html', directory);
  try { await access(page); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await copyFile(index, page);
  }
}));
