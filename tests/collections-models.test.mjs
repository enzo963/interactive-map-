import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
const { getModelEmbed, getVideoEmbed } = await server.ssrLoadModule('/src/utils/media.js');
const { hasVerifiedModel } = await server.ssrLoadModule('/src/utils/modelResources.js');
const { getRelatedSiteMatches } = await server.ssrLoadModule('/src/utils/related.js');
const { getSiteShareUrl } = await server.ssrLoadModule('/src/utils/siteLinks.js');
const { SPECIAL_COLLECTIONS, isCollectionMember } = await server.ssrLoadModule('/src/data/collections.js');
const rows = (values) => normalizeSites(values.map((value) => ({ status: 'approved', verification_status: 'approved', name: value.id, ...value })));

test('World Heritage membership cannot be forced by a deck tag or draft status', () => {
  const sites = rows([{ id: 'yes', unesco: true }, { id: 'tentative', unesco: false, decks: ['unesco'] }, { id: 'draft', status: 'needs-review', verification_status: 'needs-review', unesco: true }]);
  const collection = SPECIAL_COLLECTIONS.find((c) => c.id === 'unesco');
  assert.deepEqual(sites.filter((s) => isCollectionMember(s, collection)).map((s) => s.id), ['yes']);
});
test('3D collections require approved records and verified resource evidence', () => {
  const sites = rows([
    { id: 'verified', has3D: true, model_3d_url: '/models/test.glb' },
    { id: 'flag-only', has3D: true, decks: ['3d'] },
    { id: 'url-only', model_3d_url: '/models/test.glb' },
    { id: 'draft', status: 'needs-review', has3D: true, model_3d_url: '/models/test.glb' },
    { id: 'unsafe', has3D: true, model_3d_url: 'javascript:alert(1)' },
    { id: 'reconstruction', digital_assets: [{ type: 'reconstruction', url: 'https://example.org/reconstruction', verification_status: 'verified' }] },
    { id: 'wrong-site', digital_assets: [{ type: '3d', url: '/model.glb', verification_status: 'verified', siteId: 'other' }] },
  ]);
  assert.deepEqual(sites.filter(hasVerifiedModel).map((s) => s.id), ['verified', 'reconstruction']);
  assert.equal(sites[5].hasModel, true);
});
test('model formats and exact embed provider paths are conservative', () => {
  assert.equal(getModelEmbed('/a.glb').type, 'model');
  assert.equal(getModelEmbed('https://example.org/a.gltf').type, 'model');
  assert.equal(getModelEmbed('/a.obj').type, 'file');
  const id = '0123456789abcdef0123456789abcdef';
  assert.equal(getModelEmbed(`https://sketchfab.com/3d-models/heritage-${id}`).src, `https://sketchfab.com/models/${id}/embed`);
  assert.equal(getModelEmbed('https://sketchfab.com.evil.test/model').type, 'link');
  for (const url of ['javascript:bad', '//evil.test/x', 'http://example.org/a.glb', 'data:text/html,hello']) assert.equal(getModelEmbed(url), null);
});

test('external references and video helpers reject executable, credentialed and disguised URLs', () => {
  const unsafe = ['javascript:alert(1)', 'data:text/html,bad', '//evil.test/file', '/\\evil.test/file',
    'https://user:password@example.org/file', 'https://example.org/\nfile', 'https://example.org\\@evil.test/file'];
  for (const url of unsafe) {
    assert.equal(getVideoEmbed(url), null, url);
    const [site] = rows([{ id: 'urls', sources: [{ sourceName: 'Unsafe reference', url }],
      digital_assets: [{ title: 'Unsafe asset', url }] }]);
    assert.equal(site.sources[0].url, '', url);
    assert.equal(site.digitalAssets[0].url, '', url);
  }
  assert.equal(getVideoEmbed('https://notyoutube.com/watch?v=abcdef12345').type, 'link');
  assert.equal(getVideoEmbed('https://www.youtube.com/watch?v=abcdef12345').provider, 'YouTube');
  assert.equal(getVideoEmbed('/film.mp4').type, 'file');
});
test('related recommendations prefer strong historical connections and explain them', () => {
  const sites = rows([
    { id: 'origin', name: 'Origin', governorate: 'Ninewa', category: 'Archaeological City', period: 'Assyrian and Parthian', unesco: true, decks: ['shared'] },
    { id: 'origin-alias', slug: 'origin', governorate: 'Nineveh', period: 'Assyrian' },
    { id: 'strong-alias', slug: 'strong', governorate: 'Nineveh' },
    { id: 'strong', name: 'Strong', governorate: 'Nineveh', category: 'Archaeological City', period: 'Parthian', unesco: true },
    { id: 'near', name: 'Near', governorate: 'Nineveh', category: 'Market', period: 'Ottoman' },
    { id: 'unrelated', name: 'Unrelated', governorate: 'Erbil', category: 'Other', period: '', unesco: true, decks: ['shared'] },
    { id: 'draft', name: 'Draft', status: 'rejected', governorate: 'Nineveh', category: 'Archaeological City', period: 'Parthian' },
  ]);
  const before = structuredClone(sites);
  const result = getRelatedSiteMatches(sites[0], [...sites, sites[3]], 4);
  assert.deepEqual(result.map((m) => m.site.id), ['strong', 'near']);
  assert.ok(result[0].reasons.includes('Shared recorded period'));
  assert.ok(result[0].score > result[1].score);
  assert.deepEqual(sites, before);
  assert.equal(getRelatedSiteMatches(sites[0], sites, 0).length, 0);
});
test('equal recommendation scores are stable, and unknown values do not create relevance', () => {
  const sites = rows([
    { id: 'origin', governorate: 'Erbil', period: 'unknown' },
    { id: 'z', name: 'Zeta', governorate: 'Erbil' },
    { id: 'b', name: 'Alpha', slug: 'alpha-b', governorate: 'Erbil' },
    { id: 'a', name: 'Alpha', slug: 'alpha-a', governorate: 'Erbil' },
    { id: 'unknown', governorate: 'Duhok', period: 'unknown' },
  ]);
  assert.deepEqual(getRelatedSiteMatches(sites[0], sites).map((m) => m.site.id), ['a', 'b', 'z']);
});
test('related recommendations compare recorded periods and civilizations independently', () => {
  const sites = rows([
    { id: 'origin', civilization: 'Abbasid', period: 'Medieval' },
    { id: 'civilization', civilization: 'Abbasid' },
    { id: 'period', historical_period: 'Medieval' },
    { id: 'cross-field', civilization: 'Medieval', period: 'Abbasid' },
  ]);
  const matches = getRelatedSiteMatches(sites[0], sites);
  assert.deepEqual(Object.fromEntries(matches.map(({ site, reasons }) => [site.id, reasons])), {
    civilization: ['Shared civilization'],
    period: ['Shared recorded period'],
  });
  const fallbackSites = rows([{ id: 'origin', civilization: 'Abbasid' }, { id: 'other', period: 'Abbasid' }]);
  assert.deepEqual(getRelatedSiteMatches(fallbackSites[0], fallbackSites), []);
  const placeholderSites = rows([{ id: 'origin', period: 'N/A' }, { id: 'other', period: 'n/a' }]);
  assert.deepEqual(getRelatedSiteMatches(placeholderSites[0], placeholderSites), []);
});
test('related recommendations rank coordinate proximity across governorates and skip invalid coordinates', () => {
  const sites = rows([
    { id: 'origin', governorate: 'Nineveh', latitude: 36.0, longitude: 43.0 },
    { id: 'distant', governorate: 'Erbil', latitude: 36.7, longitude: 43.0 },
    { id: 'regional', governorate: 'Erbil', latitude: 36.4, longitude: 43.0 },
    { id: 'nearby', governorate: 'Duhok', latitude: 36.15, longitude: 43.0 },
    { id: 'closest', governorate: 'Duhok', latitude: 36.04, longitude: 43.0 },
    { id: 'missing', latitude: null, longitude: 43.0 },
    { id: 'invalid', latitude: 36.04, longitude: 403.0 },
  ]);
  assert.deepEqual(getRelatedSiteMatches(sites[0], sites).map(({ site, reasons }) => [site.id, reasons]), [
    ['closest', ['Within 10 km']],
    ['nearby', ['Within 25 km']],
    ['regional', ['Within 50 km']],
  ]);

  const equatorSites = rows([
    { id: 'origin', latitude: 0, longitude: 179.98 },
    { id: 'across-dateline', latitude: 0, longitude: -179.98 },
    { id: 'missing-latitude', latitude: null, longitude: 179.98 },
  ]);
  assert.deepEqual(getRelatedSiteMatches(equatorSites[0], equatorSites).map(({ site }) => site.id), ['across-dateline']);
});
test('explicitly linked monuments outrank incidental similarities in either direction', () => {
  const relationship = 'Monument within site-example-complex; no separate UNESCO inscription is asserted.';
  const sites = rows([
    { id: 'origin', heritage_status: relationship, category: 'Historic tower', governorate: 'Baghdad', period: 'Ottoman', latitude: 33.3, longitude: 44.4 },
    { id: 'site-example-complex' },
    { id: 'sibling', heritage_status: relationship },
    { id: 'other', category: 'Historic tower', governorate: 'Baghdad', period: 'Ottoman', latitude: 33.3, longitude: 44.4 },
    { id: 'review', heritage_status: relationship, status: 'needs-review' },
  ]);
  const matches = getRelatedSiteMatches(sites[0], sites);
  assert.deepEqual(matches.map(({ site }) => site.id), ['site-example-complex', 'sibling', 'other']);
  assert.deepEqual(matches.slice(0, 2).map(({ reasons }) => reasons), [
    ['Part of the same heritage site'],
    ['Part of the same heritage site'],
  ]);
  assert.deepEqual(getRelatedSiteMatches(sites[1], sites).map(({ site }) => site.id), ['origin', 'sibling']);
});
test('share URLs retain a saved slug even if the display name changes', () => {
  const site = { slug: 'hatra', name: 'Renamed display title' };
  assert.equal(getSiteShareUrl(site, 'https://heritage.test/current?query=old#gallery'), 'https://heritage.test/sites/hatra');
});
