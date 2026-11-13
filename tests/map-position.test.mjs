// Only verified positions become pins; every other card stays published and says why it has no pin.
// Positions flagged by tools/content-pipeline/verify_coordinates.py carry a manual decision.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { mapPosition } = await server.ssrLoadModule('/src/utils/mapPosition.js');
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { isVisibleCard } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
after(async () => { await server.close(); });

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const records = read('../src/data/sites.json');
const review = read('../tools/content-pipeline/data/coordinates/coordinate-review.json').records;
const { decisions } = read('../tools/content-pipeline/data/coordinates/coordinate-decisions.json');
const km = ([a, b], [c, d]) => {
  const rad = Math.PI / 180;
  const h = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

test('a pin needs a point of the site itself with a recorded source', () => {
  const at = { latitude: 36.3, longitude: 43.1 };
  assert.equal(mapPosition({}), 'none');
  assert.equal(mapPosition({ ...at, coordinates_precision: 'site', coordinates_source: 'wikidata:Q1' }), 'verified');
  assert.equal(mapPosition({ ...at, coordinates_precision: 'site' }), 'approximate', 'no source');
  assert.equal(mapPosition({ ...at, coordinates_precision: 'settlement', coordinates_source: 'wikidata:Q1' }), 'approximate');
  assert.equal(mapPosition({ ...at, coordinates_precision: 'approximate', coordinates_source: 'wikidata:Q1' }), 'approximate');
  assert.equal(mapPosition({ ...at }), 'approximate', 'unknown precision');
});

test('cards without a safe position stay published and carry their status', () => {
  const sites = getAllSites();
  assert.equal(sites.length, records.filter((record) => isVisibleCard(record)).length);
  const counts = sites.reduce((all, site) => ({ ...all, [site.mapPosition]: (all[site.mapPosition] ?? 0) + 1 }), {});
  assert.ok(counts.verified > 0 && counts.approximate > 0 && counts.none > 0, JSON.stringify(counts));
  assert.equal(counts.verified + counts.approximate + counts.none, sites.length);
});

test('every flagged position was decided by a person, and downgrades are not pins', () => {
  const undecided = Object.entries(review).filter(([id, entry]) => entry.flags.length && !decisions[id]).map(([id]) => id);
  assert.deepEqual(undecided, []);
  const byId = new Map(records.map((record) => [record.id, record]));
  for (const [id, decision] of Object.entries(decisions)) {
    assert.ok(['keep', 'downgrade', 'remove'].includes(decision.action) && decision.note, id);
    if (decision.action !== 'keep') assert.notEqual(mapPosition(byId.get(id)), 'verified', `${id} was ${decision.action}d`);
  }
  const placed = records.filter((record) => Number.isFinite(record.latitude));
  assert.ok(placed.every((record) => review[record.id]), 'every recorded position has been checked');
});

test('no two pins share a point unless a person confirmed both', () => {
  const pins = records.filter((record) => mapPosition(record) === 'verified');
  const clashes = [];
  for (const [i, a] of pins.entries()) {
    for (const b of pins.slice(i + 1)) {
      const family = a.parentSite === b.id || b.parentSite === a.id || (a.parentSite && a.parentSite === b.parentSite);
      if (!family && km([a.latitude, a.longitude], [b.latitude, b.longitude]) <= 0.05
        && !(decisions[a.id]?.action === 'keep' && decisions[b.id]?.action === 'keep')) clashes.push(`${a.id} = ${b.id}`);
    }
  }
  assert.deepEqual(clashes, []);
  assert.ok(pins.every((record) => record.latitude >= 29 && record.latitude <= 37.5 && record.longitude >= 38.7 && record.longitude <= 48.8));
});
