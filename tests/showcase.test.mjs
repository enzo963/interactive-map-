// Showcase records (src/data/showcase.json) lead public demonstrations: each must stay complete.
// A record that cannot meet a rule is listed in `exceptions` with the reason; otherwise replace it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { approvedCover } = await server.ssrLoadModule('/src/utils/coverApproval.js');
const { approvedGalleryImage } = await server.ssrLoadModule('/src/utils/coverage.js');
const { crediblePublishers } = await server.ssrLoadModule('/src/utils/sourceCredibility.js');
const { getDeckById } = await server.ssrLoadModule('/src/utils/decks.js');
const { getGovernorateKey } = await server.ssrLoadModule('/src/data/governorates.js');
after(async () => { await server.close(); });

const showcase = JSON.parse(readFileSync(new URL('../src/data/showcase.json', import.meta.url), 'utf8'));
const exceptions = showcase.exceptions ?? {};
const sites = getAllSites();
const byId = new Map(sites.map((site) => [site.id, site]));
const excused = (id, rule) => Boolean(exceptions[id]?.[rule]);

test('20–30 showcase records, all published, at least two in each of the nine governorates', () => {
  assert.ok(showcase.sites.length >= 20 && showcase.sites.length <= 30, `${showcase.sites.length} records`);
  assert.equal(new Set(showcase.sites).size, showcase.sites.length);
  const missing = showcase.sites.filter((id) => !byId.has(id));
  assert.deepEqual(missing, [], 'every showcase record is a published card');
  const perGovernorate = {};
  for (const id of showcase.sites) perGovernorate[getGovernorateKey(byId.get(id).governorate)] = (perGovernorate[getGovernorateKey(byId.get(id).governorate)] ?? 0) + 1;
  assert.equal(Object.keys(perGovernorate).length, 9, JSON.stringify(perGovernorate));
  assert.ok(Object.values(perGovernorate).every((n) => n >= 2), JSON.stringify(perGovernorate));
});

test('every showcase record is complete', () => {
  const problems = [];
  for (const id of showcase.sites) {
    const site = byId.get(id);
    const check = (rule, ok) => { if (!ok && !excused(id, rule)) problems.push(`${id}: ${rule}`); };
    check('cover', Boolean(approvedCover(site)));
    check('gallery', site.galleryImages.filter((image) => approvedGalleryImage(image, site.id)).length >= 1);
    check('description', site.description.length >= 120);
    check('background', site.historicalBackground.length >= 200);
    check('sources', crediblePublishers(site.sources).size >= 2);
    check('position', site.mapPosition === 'verified');
    check('alternative names', site.alternativeNames.length >= 1);
  }
  assert.deepEqual(problems, []);
});

test('every exception names a showcase record, a rule and a reason', () => {
  for (const [id, rules] of Object.entries(exceptions)) {
    assert.ok(showcase.sites.includes(id), id);
    for (const reason of Object.values(rules)) assert.ok(typeof reason === 'string' && reason.length > 20, `${id}: ${reason}`);
  }
});

test('the Highlights deck shows the showcase in its set order', () => {
  const deck = getDeckById(sites, 'highlights');
  assert.ok(deck, 'Highlights deck exists');
  assert.deepEqual(deck.sites.map((site) => site.id), showcase.sites);
});
