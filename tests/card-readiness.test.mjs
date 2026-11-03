import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { checkCardReadiness, isVisibleCard } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
after(async () => { await server.close(); });
const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));

// A minimal candidate: every required field and none of the enrichment fields.
const candidate = (changes = {}) => ({
  id: 'site-erbil-test-tell', name: 'Test Tell', governorate: 'Erbil', category: 'Archaeological Site',
  period: 'Halaf', description: 'A settlement mound recorded by a regional survey of the plain.',
  unesco: null, has3D: null, coverImage: null, galleryImages: [], image_status: 'none', status: 'needs-review',
  sources: [{ sourceName: 'Survey report', url: 'https://example.org/report', evidenceId: null, accessedAt: null }],
  ...changes,
});
const missing = (record) => checkCardReadiness(record).missing.map(({ field }) => field);

test('a candidate with only the required fields is a visible card; enrichment gaps are reported, not blocking', () => {
  const result = checkCardReadiness(candidate());
  assert.deepEqual(result.missing, []);
  assert.equal(result.visible, true);
  assert.deepEqual(result.enrichment, ['coordinates', 'alternativeNames', 'unesco', 'preservation', 'date']);
});

test('each required field blocks the card on its own', () => {
  const cases = {
    id: [{ id: '' }, { id: 'Site Erbil' }],
    name: [{ name: '  ' }],
    governorate: [{ governorate: '' }, { governorate: 'Atlantis' }],
    category: [{ category: '' }],
    description: [{ description: '' }, { description: 'Too short.' }, { description: 'x'.repeat(601) }],
    period: [{ period: '' }],
    sources: [{ sources: [] }, { sources: [{ sourceName: '', url: 'https://example.org' }] }, { sources: [{ sourceName: 'Book', url: '' }] }],
    status: [{ status: undefined }, { status: 'published' }],
    image_status: [{ image_status: undefined }, { image_status: 'approved' }, { image_status: 'unknown' }],
  };
  for (const [field, changes] of Object.entries(cases)) {
    for (const change of changes) assert.deepEqual(missing(candidate(change)), [field], `${field}: ${JSON.stringify(change)}`);
  }
});

test('an empty period passes only when the record states the sources give none', () => {
  assert.deepEqual(missing(candidate({ period: '', period_status: 'not-established' })), []);
});

test('a coordinates lookup alone is not a reliable source', () => {
  const lookup = { sourceName: 'Wikidata Q1 (coordinates)', url: 'https://www.wikidata.org/wiki/Q1' };
  assert.deepEqual(missing(candidate({ sources: [lookup] })), ['sources']);
  assert.deepEqual(missing(candidate({ sources: [lookup, candidate().sources[0]] })), []);
});

test('image status must agree with the recorded cover', () => {
  const cover = { src: 'https://example.org/cover.jpg', alt: 'Cover', caption: '', credit: '', license: '' };
  assert.deepEqual(missing(candidate({ coverImage: cover, image_status: 'pending-review' })), []);
  assert.deepEqual(missing(candidate({ coverImage: cover, image_status: 'none' })), ['image_status']);
  assert.deepEqual(missing(candidate({ coverImage: cover, image_status: 'approved' })), ['image_status']);
});

test('drafts and withdrawn records stay hidden even when complete', () => {
  for (const status of ['draft', 'withdrawn']) {
    const result = checkCardReadiness(candidate({ status }));
    assert.equal(result.ready, true);
    assert.equal(result.visible, false);
  }
  assert.equal(isVisibleCard(candidate({ status: 'approved' })), true);
});

test('every approved record meets the contract', () => {
  const failing = records.filter((record) => record.status === 'approved' && !isVisibleCard(record));
  assert.deepEqual(failing.map(({ id }) => id), []);
});

test('the site service shows exactly the records that meet the contract', () => {
  const expected = records.filter(isVisibleCard).map(({ id }) => String(id));
  assert.deepEqual(getAllSites().map(({ id }) => id), expected);
});
