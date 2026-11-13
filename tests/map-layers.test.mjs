import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(async () => server.close());
const load = () => server.ssrLoadModule('/src/utils/mapLayers.js');
const sites = [
  { id: 'arch', status: 'approved', siteType: 'Archaeological Site', period: 'Assyrian', latitude: 35, longitude: 43 },
  { id: 'religion', status: 'approved', siteType: 'Mosque', period: 'Abbasid', isUnesco: false, isLost: true, preservation: { verified: true, state: 'destroyed' } },
  { id: 'unesco', status: 'approved', siteType: 'Historic City', period: '', isUnesco: true },
  { id: 'draft', status: 'needs-review', siteType: 'Archaeological Site', period: 'Assyrian', isUnesco: true },
];

test('optional map layers combine as a union without inventing publication or model availability', async () => {
  const { filterMapSites, getMapLayerCounts } = await load();
  const before = structuredClone(sites);
  assert.deepEqual(filterMapSites(sites, {}).map((site) => site.id), sites.map((site) => site.id));
  assert.deepEqual(filterMapSites(sites, { layers: ['archaeological', 'religious'] }).map((site) => site.id), ['arch', 'religion', 'draft']);
  assert.deepEqual(filterMapSites(sites, { layers: ['unesco'] }).map((site) => site.id), ['unesco']);
  assert.deepEqual(filterMapSites(sites, { layers: ['lost'] }).map((site) => site.id), ['religion']);
  assert.deepEqual(filterMapSites(sites, { layers: ['3d'] }), []);
  assert.equal(getMapLayerCounts(sites)['historical-periods'], 2);
  assert.deepEqual(sites, before);
});

test('historical map mode is approved-only and shares multi-period matching', async () => {
  const { filterMapSites } = await load();
  assert.deepEqual(filterMapSites(sites, { historical: true, era: 'assyrian' }).map((site) => site.id), ['arch']);
  assert.deepEqual(filterMapSites(sites, { historical: true, era: 'islamic' }).map((site) => site.id), ['religion']);
  assert.equal(filterMapSites(sites, { historical: true }).length, 3);
  assert.deepEqual(filterMapSites(sites, { historical: true, era: 'not-real' }), []);
  assert.deepEqual(filterMapSites(sites, { historical: true, era: 'assyrian', layers: ['religious'] }), []);
});

test('map options validate repeated layer parameters and retain explicit grouping preferences', async () => {
  const { readMapOptions, clusterRadius } = await load();
  assert.deepEqual(readMapOptions(new URLSearchParams('layer=religious&layer=religious&layer=invalid&view=history&era=assyrian&cluster=off')), {
    layers: ['religious'], historical: true, era: 'assyrian', clustered: false,
  });
  assert.ok(clusterRadius(5) > clusterRadius(14));
  assert.equal(readMapOptions(new URLSearchParams()).clustered, true);
});
