import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';
import { createServer, loadEnv } from 'vite';
import { normalizePath, publicOrigin } from '../src/seo/metadata.js';
import { renderRobots, renderSitemap, replaceMetadata } from '../src/seo/head.js';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Generate heads from the UI's own normalized records without bundling a second dataset. */
export async function buildSeo({ outDir = join(root, 'dist'), siteUrl = '', mode = 'production', approvedOnly = process.env.HB_RELEASE_APPROVED_ONLY === '1' } = {}) {
  const origin = publicOrigin(siteUrl);
  const output = resolve(outDir);
  const template = await readFile(join(output, 'index.html'), 'utf8');
  const server = await createServer({
    root, configFile: false, mode, logLevel: 'error', appType: 'custom',
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  let pages;
  try {
    const { metadataPaths, metadataForLocation } = await server.ssrLoadModule('/src/seo/context.js');
    const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
    const sites = getAllSites().filter((site) => !approvedOnly || site.status === 'approved');
    pages = metadataPaths(sites).map((path) => ({ path, meta: metadataForLocation(path, '', origin, false, sites) }));
    pages.push({ path: '/404', meta: metadataForLocation('/404', '', origin) });
  } finally {
    await server.close();
  }
  for (const { path, meta } of pages) {
    const relative = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
    const file = resolve(output, relative);
    if (!file.startsWith(`${output}${sep}`)) throw new Error(`Unsafe SEO output path: ${path}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, replaceMetadata(template, meta));
  }
  const urls = pages.filter(({ path, meta }) => meta.robots === 'index, follow' && meta.canonical === `${origin}${normalizePath(path)}`).map(({ meta }) => meta.canonical);
  await writeFile(join(output, 'robots.txt'), renderRobots(origin));
  if (origin) {
    await writeFile(join(output, 'sitemap.xml'), renderSitemap(urls));
  } else {
    try { await unlink(join(output, 'sitemap.xml')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { pages: pages.length, sitemapUrls: urls.length, publicOrigin: origin || null };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'production';
  const env = loadEnv(mode, root, 'VITE_');
  const result = await buildSeo({ mode, siteUrl: process.env.VITE_SITE_URL ?? env.VITE_SITE_URL ?? '' });
  console.log(`SEO: ${result.pages} HTML heads; ${result.sitemapUrls} sitemap URLs. ${result.publicOrigin ? `Domain: ${result.publicOrigin}` : 'Set VITE_SITE_URL to activate public canonical URLs and sitemap.xml; indexing is disabled.'}`);
}
