/**
 * Search discoverability audit (npm run check:search). For every record from a discovery batch it runs
 * the searches a visitor would type, through the site's own search (applyFilters → searchSites):
 *   name           the primary name, and the name without punctuation, articles or apostrophes
 *   alias          each alternative name, and the same variants
 *   governorate    the name without its place, plus the governorate written each common way
 *   category       the category, its plural and its Arabic word
 *   period         each period word in English and Arabic
 * plus the curated real-world queries in tests/fixtures/search-expectations.json.
 * Prints every query that misses its record and exits 1 if any does.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' });
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { applyFilters, EMPTY_FILTERS } = await server.ssrLoadModule('/src/utils/filterSites.js');
const { discoverabilityQueries } = await server.ssrLoadModule('/src/utils/searchAudit.js');
await server.close();

const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const fresh = new Set(records.filter((record) => record.discovery_batch).map((record) => record.id));
const expectations = JSON.parse(readFileSync(new URL('../tests/fixtures/search-expectations.json', import.meta.url), 'utf8')).queries;
const sites = getAllSites();
const byId = new Map(sites.map((site) => [site.id, site]));
const finds = (query, id) => applyFilters(sites, { ...EMPTY_FILTERS, q: query }).some((site) => site.id === id);

const misses = [];
let checked = 0;
for (const site of sites.filter((item) => fresh.has(item.id))) {
  for (const { kind, query } of discoverabilityQueries(site)) {
    checked += 1;
    if (!finds(query, site.id)) misses.push({ kind, id: site.id, query });
  }
}
for (const { query, id, kind } of expectations) {
  checked += 1;
  if (!byId.has(id)) misses.push({ kind: `${kind} (record not published)`, id, query });
  else if (!finds(query, id)) misses.push({ kind, id, query });
}

console.log(`${fresh.size} new records, ${checked} searches checked, ${misses.length} missed.`);
const kinds = {};
for (const miss of misses) (kinds[miss.kind] ??= []).push(miss);
for (const [kind, items] of Object.entries(kinds)) {
  console.log(`\n${kind}: ${items.length}`);
  for (const item of process.argv.includes('--all') ? items : items.slice(0, 20)) console.log(`  ${item.id}  "${item.query}"`);
}
if (misses.length) process.exitCode = 1;
