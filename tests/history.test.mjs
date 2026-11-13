import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(async () => { await server.close(); });
const history = await server.ssrLoadModule('/src/utils/history.js');
const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const approved = (id, fields = {}) => ({ id, status: 'approved', ...fields });
const ids = (sites) => sites.map(({ id }) => id);

test('visual identity membership shares explicit period matching without changing approval', () => {
  assert.equal(typeof history.getSiteHistoryEras, 'function');
  const record = { id: 'visual-only', status: 'needs-review', period: 'Assyrian and Parthian' };
  const before = structuredClone(record);
  assert.deepEqual(history.getSiteHistoryEras(record).map(({ id }) => id), ['assyrian', 'parthian']);
  assert.deepEqual(history.getSiteHistoryEras({ period: 'Abbasid' }).map(({ id }) => id), ['islamic']);
  assert.deepEqual(history.getSiteHistoryEras({ period: 'Unknown local phase', name: 'Assyrian' }), []);
  assert.deepEqual(record, before);
  assert.deepEqual(history.getHistorySites([record]), []);
});

test('recorded periods place the 34 approved records without inventing missing eras', () => {
  assert.equal(typeof history.getHistoryGroups, 'function');
  assert.equal(history.getHistorySites(records).length, 34);
  assert.deepEqual(history.getHistoryGroups(records).map(({ id, sites }) => [id, sites.length]), [
    ['neolithic', 1], ['assyrian', 4], ['babylonian', 1], ['hellenistic', 1], ['parthian', 2],
    ['sasanian', 0], ['islamic', 6], ['medieval', 2], ['ottoman', 5], ['nineteenth-century', 1],
    ['british', 1], ['modern', 1],
  ]);
  const unplaced = history.getUnplacedHistorySites(records);
  assert.equal(unplaced.length, 11);
  assert.ok(unplaced.some(({ id }) => id === 'site-erbil-shanidar-cave'));
});

test('approval is required and deduplication keeps input order across history views', () => {
  const first = approved('first', { period: 'Assyrian and Parthian' });
  const second = approved('second', { period: 'Assyrian' });
  const sites = [first, { ...first }, { id: 'draft', status: 'draft', period: 'Assyrian' }, second,
    { id: 'missing-status', period: 'Assyrian' }, { id: 'alias', verification_status: 'approved', period: 'Parthian' }];
  assert.deepEqual(ids(history.getHistorySites(sites)), ['first', 'second', 'alias']);
  const groups = history.getHistoryGroups(sites);
  assert.deepEqual(ids(groups.find(({ id }) => id === 'assyrian').sites), ['first', 'second']);
  assert.deepEqual(ids(groups.find(({ id }) => id === 'parthian').sites), ['first', 'alias']);
  assert.deepEqual(history.getUnplacedHistorySites(sites), []);
});

test('era matching uses whole Unicode words in period and civilization only', () => {
  const sites = [
    approved('alias', { civilization: 'ABBASID', period: 'Old Babylonian' }),
    approved('unicode', { period: 'Ｎｅｏｌｉｔｈｉｃ' }),
    approved('punctuation', { period: 'Neo-Assyrian / Parthian' }),
    approved('incidental', { name: 'Ottoman', description: 'Assyrian', historical_background: 'Modern', date: 'British' }),
    approved('word-fragment', { period: 'Postmodern; nonIslamic; Assyrianized; éAssyrian; Assyriané' }),
    approved('unknown', { period: 'Unestablished local phase' }),
  ];
  const groups = history.getHistoryGroups(sites);
  assert.deepEqual(ids(groups.find(({ id }) => id === 'islamic').sites), ['alias']);
  assert.deepEqual(ids(groups.find(({ id }) => id === 'babylonian').sites), ['alias']);
  assert.deepEqual(ids(groups.find(({ id }) => id === 'neolithic').sites), ['unicode']);
  assert.deepEqual(ids(groups.find(({ id }) => id === 'assyrian').sites), ['punctuation']);
  assert.deepEqual(ids(history.getUnplacedHistorySites(sites)), ['incidental', 'word-fragment', 'unknown']);
});

test('period selection preserves complete raw labels and matches normalized labels exactly', () => {
  const sites = [approved('one', { period: 'Abbasid', civilization: 'Islamic' }),
    approved('two', { period: 'Multi-period, including Old Babylonian' }),
    approved('three', { period: 'abbasid' }), approved('empty', { period: '' }),
    { id: 'draft', status: 'draft', period: 'Secret period' }];
  assert.deepEqual(history.getRecordedPeriods(sites), ['Abbasid', 'Islamic', 'Multi-period, including Old Babylonian']);
  assert.equal(history.matchesRecordedPeriod(sites[0], '  ABBASID  '), true);
  assert.equal(history.matchesRecordedPeriod(sites[0], 'Islamic'), true);
  assert.equal(history.matchesRecordedPeriod(sites[1], 'Babylonian'), false);
  assert.equal(history.matchesRecordedPeriod(sites[3], ''), false);
});

test('history exploration leaves source records and their missing dates intact', () => {
  const sites = [approved('known', { period: 'Ottoman and British periods', date: null }), approved('missing')];
  const original = structuredClone(sites);
  sites.forEach(Object.freeze);
  Object.freeze(sites);
  history.getHistorySites(sites);
  history.getHistoryGroups(sites);
  history.getUnplacedHistorySites(sites);
  history.getRecordedPeriods(sites);
  assert.deepEqual(sites, original);
});
