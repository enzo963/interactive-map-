import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(async () => server.close());
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
const { searchSites } = await server.ssrLoadModule('/src/utils/search.js');
const { filterSites } = await server.ssrLoadModule('/src/utils/filters.js');
const { EMPTY_FILTERS, parseFilters, serializeFilters, applyFilters, getFacets, sortSites } = await server.ssrLoadModule('/src/utils/filterSites.js');
const sites = normalizeSites([
  { id: 'a', name: 'Café Palace', alternative_names: ['Qasr Test', 'القصر العباسي'], governorate: 'Erbil', category: 'Palace', period: 'Abbasid', civilization: 'Named civilization', unesco: true, has3D: true },
  { id: 'b', name: 'Bridge', governorate: 'Duhok', category: 'Historic Bridge', period: 'Multi-period, including Ottoman', unesco: false, has3D: false },
  { id: 'c', name: 'Museum', governorate: 'Erbil', category: 'Memorial Museum', period: '', unesco: null, unesco_status: 'tentative ensemble context', has3D: null },
]);
const state = (patch) => ({ ...EMPTY_FILTERS, ...patch });
test('search includes Unicode aliases, accents and all query words without mutating records', () => {
  const before = structuredClone(sites);
  assert.equal(searchSites(sites, ' CAFE ')[0].id, 'a');
  assert.equal(searchSites(sites, 'test qasr')[0].id, 'a');
  assert.equal(searchSites(sites, 'القصر العباسي')[0].id, 'a');
  assert.equal(searchSites(sites, 'Duhok').length, 0);
  assert.equal(applyFilters(sites, state({ q: 'Duhok' }))[0].id, 'b');
  assert.equal(searchSites(sites, 'not-found').length, 0);
  assert.deepEqual(sites, before);
});
test('negative and unknown status filters stay distinct and null never gains an inscription badge', () => {
  assert.equal(sites[2].isUnesco, false);
  assert.deepEqual(filterSites(sites, { unesco: false }).map((s) => s.id), ['b']);
  assert.deepEqual(filterSites(sites, { unesco: 'unknown' }).map((s) => s.id), ['c']);
  assert.deepEqual(filterSites(sites, { has3D: false }).map((s) => s.id), ['b']);
  assert.deepEqual(applyFilters(sites, state({ has3D: 'unknown' })).map((s) => s.id), ['c']);
});
test('governorate aliases, period/civilization, category and statuses combine', () => {
  const result = applyFilters(sites, state({ governorates: ['Arbil'], periods: ['Named civilization'], themes: ['architectural'], unesco: 'yes', has3D: 'yes' }));
  assert.deepEqual(result.map((s) => s.id), ['a']);
  assert.deepEqual(applyFilters(sites, state({ periods: ['__unknown__'] })).map((s) => s.id), ['c']);
  assert.deepEqual(applyFilters(sites, state({ themes: ['cultural'] })).map((s) => s.id), ['c']);
});
test('filter URLs round-trip comma-containing periods and preserve unrelated Map state', () => {
  const filters = state({ q: 'Qasr Test', periods: ['Multi-period, including Ottoman', 'Abbasid'], themes: ['religious'], unesco: 'unknown', has3D: 'no' });
  const query = serializeFilters(filters, new URLSearchParams('region=nineveh&site=hatra'));
  assert.deepEqual(parseFilters(query), filters);
  assert.equal(query.get('site'), 'hatra');
  assert.equal(query.get('region'), 'nineveh');
  assert.equal(parseFilters(new URLSearchParams('unesco=invalid')).unesco, '');
});
test('facet counts omit only their own group; alias matches also receive relevance ranking', () => {
  const facets = getFacets(sites, state({ governorates: ['erbil'], unesco: 'yes' }));
  assert.equal(facets.unesco.find((f) => f.id === 'unknown').count, 1);
  assert.equal(facets.unesco.find((f) => f.id === 'yes').count, 1);
  assert.equal(facets.periods.find((f) => f.id === '__unknown__').count, 0);
  assert.equal(sortSites(sites, state({ q: 'Qasr Test' }))[0].id, 'a');
});

test('repeated and comma-separated selections combine without splitting a period label', () => {
  const params = new URLSearchParams('gov=Arbil,Erbil&gov=Duhok&type=0,1&type=1,bad&kind=palace&kind=historic-bridge&sort=invalid');
  params.append('period', 'Multi-period, including Ottoman');
  params.append('period', 'Abbasid');
  const filters = parseFilters(params);
  assert.deepEqual(filters.governorates, ['erbil', 'duhok']);
  assert.deepEqual(filters.types, ['0', '1']);
  assert.deepEqual(filters.kinds, ['palace', 'historic-bridge']);
  assert.deepEqual(filters.periods, ['Multi-period, including Ottoman', 'Abbasid']);
  assert.equal(filters.sort, '');
  assert.deepEqual(parseFilters(serializeFilters(filters)), filters);
});


test('legacy unrecorded flags remain unknown rather than becoming explicit negatives', () => {
  const [unknown] = normalizeSites([{ id: 'missing', name: 'Missing flags', unesco_status: 'unknown' }]);
  assert.equal(unknown.unesco, null);
  assert.equal(unknown.has3D, null);
  assert.equal(filterSites([unknown], { unesco: false, has3D: false }).length, 0);
});
