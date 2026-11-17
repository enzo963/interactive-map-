import { build, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { buildSeo } from './build-seo.mjs';

const repo = process.env.GITHUB_REPOSITORY?.split('/').at(-1) ?? 'interactive-map-';
const basePath = process.env.HB_PAGES_BASE_PATH ?? (repo.endsWith('.github.io') ? '' : `/${repo}`);
const base = `${basePath.replace(/\/$/, '')}/`;
const outDir = resolve(process.env.HB_PAGES_OUT || 'dist');
await build({ base, build: { outDir } });

// Pages serves directory indexes for direct visits and 404.html for unrecognized URLs.
const { VITE_SITE_URL } = loadEnv('production', process.cwd(), 'VITE_');
const seo = await buildSeo({ outDir, directoryIndexes: true, base, siteUrl: process.env.VITE_SITE_URL ?? VITE_SITE_URL ?? '' });
console.log(`Pages SEO: ${seo.pages} HTML heads; ${seo.sitemapUrls} sitemap URLs at base ${base}.`);
