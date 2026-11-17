import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { build } from 'vite';
import { getGovernorateKey } from '../src/data/governorates.js';

const repo = process.env.GITHUB_REPOSITORY?.split('/').at(-1) ?? 'interactive-map-';
const base = repo.endsWith('.github.io') ? '/' : `/${repo}/`;
await build({ base });

const dist = new URL('../dist/', import.meta.url);
const index = new URL('index.html', dist);
const records = JSON.parse(await readFile(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const routes = new Set(['explore', 'map', 'decks', 'decks/unesco', 'decks/3d', 'unesco', '3d-archive', 'about', 'methodology', 'our-work', 'contact']);
for (const site of records) {
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug)) routes.add(`sites/${site.slug}`);
  const governorate = getGovernorateKey(site.governorate);
  if (governorate) routes.add(`decks/${governorate}`);
}

// Pages serves directory indexes for direct visits and 404.html for unrecognized URLs.
await copyFile(index, new URL('404.html', dist));
await Promise.all([...routes].map(async (route) => {
  const directory = new URL(`${route}/`, dist);
  await mkdir(directory, { recursive: true });
  await copyFile(index, new URL('index.html', directory));
}));
