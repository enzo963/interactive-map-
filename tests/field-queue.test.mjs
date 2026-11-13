// The field-completeness queue separates what blocks publication from optional enrichment,
// and works enrichment in passes so no card is perfected while others wait.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { buildFieldQueue, blockingProblems, attributionGaps, nextTasks, PASSES } = await server.ssrLoadModule('/src/utils/fieldQueue.js');
const { checkCardReadiness } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
const { approvedCover } = await server.ssrLoadModule('/src/utils/coverApproval.js');
after(async () => { await server.close(); });

const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const candidate = (changes = {}) => ({
  id: 'site-erbil-test-tell', name: 'Test Tell', governorate: 'Erbil', category: 'Archaeological Site',
  period: 'Halaf', description: 'A settlement mound recorded by a regional survey of the plain.',
  unesco: null, has3D: null, coverImage: null, galleryImages: [], image_status: 'none', status: 'needs-review',
  sources: [{ sourceName: 'Survey report', url: 'https://isac.uchicago.edu/report' }],
  ...changes,
});
const passFields = (queue, id) => queue.passes.filter((pass) => pass.sites.some((site) => site.id === id)).map((pass) => pass.field);

test('missing required fields block publication; enrichment gaps do not', () => {
  assert.deepEqual(blockingProblems(candidate()), []);
  assert.deepEqual(blockingProblems(candidate({ description: '', category: '' })).map((p) => p.field), ['category', 'description']);
  assert.deepEqual(blockingProblems(candidate({ sources: [] })).map((p) => p.field), ['sources']);
  assert.deepEqual(blockingProblems(candidate({ governorate: 'Atlantis' })).map((p) => p.field), ['governorate']);

  const queue = buildFieldQueue([candidate(), candidate({ id: 'site-erbil-broken', description: '' })]);
  assert.deepEqual(queue.blocking.map((item) => item.id), ['site-erbil-broken']);
  assert.equal(queue.totals.published, 1);
  assert.deepEqual(passFields(queue, 'site-erbil-test-tell'),
    ['location', 'coordinates', 'alternativeNames', 'primaryImage', 'date', 'preservation', 'unesco']);
  assert.deepEqual(passFields(queue, 'site-erbil-broken'), [], 'a blocked record is not enriched before it is fixed');
});

test('a displayed image without attribution blocks; a public-domain image needs no licence link', () => {
  assert.deepEqual(attributionGaps({ credit: 'A', license: 'Public domain', sourceUrl: 'https://x' }), []);
  assert.deepEqual(attributionGaps({ credit: 'A', license: 'CC BY-SA 4.0', sourceUrl: 'https://x' }), ['license_url']);
  assert.deepEqual(attributionGaps({ license: 'CC BY 2.0', license_url: 'https://cc', sourceUrl: 'https://x' }), ['credit']);

  const withCover = records.find((record) => approvedCover(record) && checkCardReadiness(record).visible);
  assert.deepEqual(blockingProblems(withCover), []);
  const uncredited = { ...withCover, coverImage: { ...withCover.coverImage, credit: '' } };
  assert.deepEqual(blockingProblems(uncredited).map((p) => p.field), ['image-attribution']);
});

test('a researched gap recorded as not-found leaves the queue', () => {
  const record = candidate();
  const decisions = { [record.id]: { coordinates: { outcome: 'not-found', note: 'no published position', decidedAt: '2026-11-12' } } };
  const queue = buildFieldQueue([record], { decisions });
  const coordinates = queue.passes.find((pass) => pass.field === 'coordinates');
  assert.equal(coordinates.missing, 1);
  assert.equal(coordinates.settled, 1);
  assert.equal(coordinates.open, 0);
});

test('cards the image queue flagged are settled for the primary-image pass', () => {
  const record = candidate();
  const queue = buildFieldQueue([record], { imageState: { [record.id]: { status: 'flagged', reason: 'no-wikidata-item' } } });
  assert.equal(queue.passes.find((pass) => pass.field === 'primaryImage').open, 0);
});

test('a work batch lists each card once: blocking first, then the first pass across many cards', () => {
  const cards = Array.from({ length: 6 }, (_, i) => candidate({ id: `site-erbil-tell-${i}`, name: `Tell ${i}` }));
  const queue = buildFieldQueue([...cards, candidate({ id: 'site-erbil-broken', sources: [] })]);
  const batch = nextTasks(queue, 5);
  assert.equal(batch[0].kind, 'blocking');
  assert.equal(new Set(batch.map((task) => task.id)).size, batch.length, 'no card appears twice in a batch');
  assert.ok(batch.slice(1).every((task) => task.fields[0] === 'location'), 'one field across cards, not one card across fields');
});

test('approved cards come first within a pass', () => {
  const queue = buildFieldQueue([candidate({ id: 'site-erbil-a' }), candidate({ id: 'site-erbil-b', status: 'approved' })]);
  assert.equal(queue.passes[0].sites[0].id, 'site-erbil-b');
});

test('on the real archive, blocking matches the card contract and no approved record is blocked', () => {
  const queue = buildFieldQueue(records);
  const hidden = records.filter((record) => !checkCardReadiness(record).ready).map((record) => record.id).sort();
  assert.deepEqual(queue.blocking.filter((item) => item.problems.some((p) => p.field !== 'image-attribution')).map((item) => item.id).sort(), hidden);
  assert.equal(queue.blocking.filter((item) => item.status === 'approved').length, 0);
  assert.equal(queue.totals.published, records.filter((record) => checkCardReadiness(record).visible).length);
  assert.equal(queue.passes.length, PASSES.length);
});
