import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { checkCardReadiness, isVisibleCard, verificationFlags } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
const { sourceTier, bestTier } = await server.ssrLoadModule('/src/utils/sourceCredibility.js');
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
after(async () => { await server.close(); });
const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));

// A minimal candidate: every required field and none of the enrichment fields.
const candidate = (changes = {}) => ({
  id: 'site-erbil-test-tell', name: 'Test Tell', governorate: 'Erbil', category: 'Archaeological Site',
  period: 'Halaf', description: 'A settlement mound recorded by a regional survey of the plain.',
  unesco: null, has3D: null, coverImage: null, galleryImages: [], image_status: 'none', status: 'needs-review',
  sources: [{ sourceName: 'Survey report', url: 'https://isac.uchicago.edu/report', evidenceId: null, accessedAt: null }],
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
    sources: [{ sources: [] }, { sources: [{ sourceName: '', url: 'https://isac.uchicago.edu' }] }, { sources: [{ sourceName: 'Book', url: '' }] }],
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

const cite = (url, extra = {}) => ({ sourceName: 'Cited page', url, evidenceId: null, accessedAt: null, ...extra });

test('source tiers follow the credibility registry, including subdomains', () => {
  assert.equal(sourceTier(cite('https://whc.unesco.org/en/list/276/')), '1');
  assert.equal(sourceTier(cite('https://www.persee.fr/doc/x')), '2');
  assert.equal(sourceTier(cite('https://en.wikipedia.org/wiki/Hatra')), '3');
  assert.equal(sourceTier(cite('https://showcaves.com/caves/x.html')), '4');
  assert.equal(sourceTier(cite('https://www.wikidata.org/wiki/Q1')), 'locator');
  assert.equal(sourceTier(cite('https://unknown-travel-blog.example/post')), null);
});

test('discovery sites, coordinate lookups and unclassified pages never support a card on their own', () => {
  for (const url of ['https://showcaves.com/caves/x.html', 'https://www.wikidata.org/wiki/Q1', 'https://unknown-travel-blog.example/post']) {
    assert.deepEqual(missing(candidate({ sources: [cite(url)] })), ['sources'], url);
  }
  assert.deepEqual(missing(candidate({ sources: [cite('https://showcaves.com/x'), cite('https://en.wikipedia.org/wiki/X')] })), []);
});

test('a mirror counts as the work it hosts only when the record says why', () => {
  const mirror = cite('https://www.kurdipedia.org/files/paper.pdf', { sourceType: 'academic-publication' });
  assert.equal(sourceTier(mirror), '4');
  assert.equal(sourceTier({ ...mirror, sourceTypeNote: 'Copy of a journal article.' }), '2');
});

test('cards list their strongest evidence first, keeping the recorded order within a tier', () => {
  const [site] = normalizeSites([candidate({ sources: [
    cite('https://www.wikidata.org/wiki/Q1', { sourceName: 'Lookup' }), cite('https://showcaves.com/x', { sourceName: 'Blog' }),
    cite('https://en.wikipedia.org/wiki/X', { sourceName: 'Encyclopaedia' }), cite('https://whc.unesco.org/en/list/1/', { sourceName: 'UNESCO' }),
    cite('https://en.wikipedia.org/wiki/Y', { sourceName: 'Second article' }),
  ] })]);
  assert.deepEqual(site.sources.map(({ sourceName }) => sourceName), ['UNESCO', 'Encyclopaedia', 'Second article', 'Lookup', 'Blog']);
});

test('the review queue marks weak or uncorroborated evidence without hiding the card', () => {
  const wikipediaOnly = candidate({ sources: [cite('https://en.wikipedia.org/wiki/X')] });
  assert.deepEqual(verificationFlags(wikipediaOnly), ['reference-only']);
  assert.equal(isVisibleCard(wikipediaOnly), true);
  const city = candidate({ category: 'Archaeological City', sources: [cite('https://whc.unesco.org/a'), cite('https://whc.unesco.org/b')] });
  assert.deepEqual(verificationFlags(city), ['needs-corroboration']);
  assert.deepEqual(verificationFlags({ ...city, sources: [...city.sources, cite('https://www.persee.fr/doc/x')] }), []);
  assert.deepEqual(verificationFlags(candidate(), { componentCount: 2 }), ['needs-corroboration']);
  assert.deepEqual(verificationFlags(candidate({ sources: [...candidate().sources, cite('https://showcaves.com/x'), cite('https://new-site.example/x')] })),
    ['discovery-cited', 'unclassified-source']);
});

test('every source cited in the data comes from a classified domain', () => {
  const unclassified = records.flatMap(({ id, sources }) => sources.filter((source) => sourceTier(source) === null).map((source) => `${id}: ${source.url}`));
  assert.deepEqual(unclassified, []);
  assert.ok(records.filter(isVisibleCard).every(({ sources }) => bestTier(sources) !== null));
});
