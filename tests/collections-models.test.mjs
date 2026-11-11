import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
const { getModelEmbed } = await server.ssrLoadModule('/src/utils/media.js');
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
test('related recommendations prefer strong historical connections and explain them', () => {
  const sites = rows([
    { id: 'origin', name: 'Origin', governorate: 'Ninewa', category: 'Archaeological City', period: 'Assyrian and Parthian', unesco: true },
    { id: 'strong', name: 'Strong', governorate: 'Nineveh', category: 'Archaeological City', period: 'Parthian', unesco: true },
    { id: 'near', name: 'Near', governorate: 'Nineveh', category: 'Market', period: 'Ottoman' },
    { id: 'unrelated', name: 'Unrelated', governorate: 'Erbil', category: 'Other', period: '', unesco: true, decks: ['shared'] },
    { id: 'draft', name: 'Draft', status: 'rejected', governorate: 'Nineveh', category: 'Archaeological City', period: 'Parthian' },
  ]);
  const before = structuredClone(sites);
  const result = getRelatedSiteMatches(sites[0], [...sites, sites[1]], 4);
  assert.deepEqual(result.map((m) => m.site.id), ['strong', 'near']);
  assert.ok(result[0].reasons.includes('Shared period or civilization'));
  assert.ok(result[0].score > result[1].score);
  assert.deepEqual(sites, before);
  assert.equal(getRelatedSiteMatches(sites[0], sites, 0).length, 0);
});
test('equal recommendation scores are stable, and unknown values do not create relevance', () => {
  const sites = rows([{ id: 'origin', governorate: 'Erbil', period: 'unknown' }, { id: 'z', name: 'Zeta', governorate: 'Erbil' }, { id: 'a', name: 'Alpha', governorate: 'Erbil' }, { id: 'unknown', governorate: 'Duhok', period: 'unknown' }]);
  assert.deepEqual(getRelatedSiteMatches(sites[0], sites).map((m) => m.site.id), ['a', 'z']);
});
test('share URLs retain a saved slug even if the display name changes', () => {
  const site = { slug: 'hatra', name: 'Renamed display title' };
  assert.equal(getSiteShareUrl(site, 'https://heritage.test/current?query=old#gallery'), 'https://heritage.test/sites/hatra');
});
