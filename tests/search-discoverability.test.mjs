// Every newly added card can be found by its name, its aliases, its governorate however it is written,
// its category and its period, in English and Arabic, and spelling tolerance does not flood results.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { applyFilters, EMPTY_FILTERS } = await server.ssrLoadModule('/src/utils/filterSites.js');
const { searchTokens, looseKey } = await server.ssrLoadModule('/src/utils/search.js');
const { discoverabilityQueries } = await server.ssrLoadModule('/src/utils/searchAudit.js');
after(async () => { await server.close(); });

const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const { queries: expectations } = JSON.parse(readFileSync(new URL('./fixtures/search-expectations.json', import.meta.url), 'utf8'));
const sites = getAllSites();
const search = (q) => applyFilters(sites, { ...EMPTY_FILTERS, q });
const names = (q) => search(q).map((site) => site.name);

test('every new card is found by its name, aliases, governorate, category and period', () => {
  const fresh = new Set(records.filter((record) => record.discovery_batch).map((record) => record.id));
  const misses = [];
  for (const site of sites.filter((item) => fresh.has(item.id))) {
    for (const { kind, query } of discoverabilityQueries(site)) {
      if (!search(query).some((found) => found.id === site.id)) misses.push(`${kind}: "${query}" → ${site.id}`);
    }
  }
  assert.deepEqual(misses, []);
});

test('curated real-world searches find their card', () => {
  const misses = expectations.filter(({ query, id }) => !search(query).some((site) => site.id === id))
    .map(({ kind, query, id }) => `${kind}: "${query}" → ${id}`);
  assert.deepEqual(misses, []);
});

test('punctuation, apostrophes and Arabic letter forms are folded', () => {
  assert.deepEqual(searchTokens("Qal‘at al-Bahrain (Ezra), St. George's"), ['qalat', 'al', 'bahrain', 'ezra', 'st', 'georges']);
  assert.deepEqual(searchTokens('قلعةُ أربيل'), ['قلعه', 'اربيل']);
  assert.equal(looseKey('tell'), looseKey('tal'));
  assert.equal(looseKey('sheikh'), looseKey('shaykh'));
  assert.equal(looseKey('kadhimiya'), looseKey('kazimiya'));
  assert.equal(looseKey('assur'), looseKey('ashur'));
  assert.notEqual(looseKey('omar'), looseKey('mar'));
  assert.notEqual(looseKey('hamam'), looseKey('imam'));
  assert.notEqual(looseKey('church'), looseKey('karkh'));
});

test('spelling tolerance does not return unrelated cards', () => {
  assert.ok(!names('omar').some((name) => /^(St\.?|Mar) /.test(name)), '"omar" does not match Mar or St churches');
  assert.ok(names('hamam').every((name) => /hamm?am|bath/i.test(name)), '"hamam" finds baths, not imams');
  assert.ok(!names('church').some((name) => /mosque|round city/i.test(name)), '"church" does not match Karkh');
  assert.ok(!names('mosque').includes('Mashki Gate'), 'a grouped term matches by meaning only');
  assert.ok(!names('ali').some((name) => /khalil/i.test(name) && !/\bali\b/i.test(name)), 'words match from their start');
});

test('a university (jamia) is not a mosque (jami), and the best name match ranks first', async () => {
  const { sortSites } = await server.ssrLoadModule('/src/utils/filterSites.js');
  assert.ok(!names('mosques Baghdad').includes('University of Baghdad Campus (Gropius)'));
  assert.deepEqual(names('جامعة بغداد'), ['University of Baghdad Campus (Gropius)']);
  const ranked = (q) => sortSites(search(q), { ...EMPTY_FILTERS, q }).map((site) => site.name);
  assert.equal(ranked('Hawler citadel')[0], 'Erbil Citadel');
  assert.equal(ranked('souq Mosul')[0], 'Souq Bab al-Saray');
  assert.equal(ranked('Kalhu')[0], 'Nimrud');
});
