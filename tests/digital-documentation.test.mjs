// 3D documentation: every resource is classified (measured vs modelled), bound to existing cards,
// shown measured-first, and never decides whether a card is published.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { documentationForSite, MAX_DOCUMENTATION_PER_SITE } = await server.ssrLoadModule('/src/utils/digitalDocumentation.js');
const ModelViewer = (await server.ssrLoadModule('/src/components/site/ModelViewer.jsx')).default;
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { isVisibleCard } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
after(async () => { await server.close(); });

const data = JSON.parse(readFileSync(new URL('../src/data/digital-documentation.json', import.meta.url), 'utf8'));
const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const ids = new Set(records.map((record) => record.id));

test('every resource is classified, attributed and linked to existing cards', () => {
  assert.ok(data.resources.length > 0);
  const seen = new Set();
  for (const resource of data.resources) {
    const label = `${resource.modelId} ${resource.title}`;
    assert.match(resource.modelId, /^[a-f0-9]{32}$/, label);
    assert.ok(!seen.has(resource.modelId), `${label}: listed twice`);
    seen.add(resource.modelId);
    assert.equal(resource.url, `https://sketchfab.com/3d-models/${resource.modelId}`, label);
    assert.ok(['measured', 'modeled'].includes(resource.documentation), label);
    assert.ok(data.methods[resource.method], `${label}: method`);
    assert.equal(resource.method === 'manual-modeling', resource.documentation === 'modeled', `${label}: a hand-built model is never measured`);
    assert.ok(['stated', 'inferred'].includes(resource.methodEvidence), label);
    assert.ok(resource.methodNote.trim().length >= 20, `${label}: why the method is known`);
    assert.ok(resource.depicts.trim(), `${label}: what state it shows`);
    assert.ok(resource.license.trim(), `${label}: license or rights`);
    const creator = data.creators[resource.creator];
    assert.ok(creator && data.creatorTypes.includes(creator.type), `${label}: creator`);
    assert.match(resource.verification.checkedAt, /^\d{4}-\d{2}-\d{2}$/, label);
    for (const link of resource.sites) {
      assert.ok(ids.has(link.siteId), `${label}: no card ${link.siteId}`);
      assert.ok(['site', 'part', 'context'].includes(link.relation), label);
      if (link.relation !== 'site') assert.ok(link.note?.trim(), `${label}: a ${link.relation} link explains itself`);
    }
  }
});

test('a card lists measured documentation before modelled reconstructions', () => {
  const nouri = documentationForSite('site-nineveh-al-nouri');
  const classes = nouri.map((resource) => resource.documentation);
  assert.ok(classes.includes('measured') && classes.includes('modeled'));
  assert.deepEqual(classes, [...classes].sort((a, b) => (a === b ? 0 : a === 'measured' ? -1 : 1)));
  for (const siteId of new Set(data.resources.flatMap((resource) => resource.sites.map((link) => link.siteId)))) {
    assert.ok(documentationForSite(siteId).length <= MAX_DOCUMENTATION_PER_SITE, siteId);
  }
});

test('the priority sites are matched', () => {
  assert.equal(documentationForSite('site-nineveh-dominican-church')[0].title, "Al_Saa'a Church");
  assert.equal(documentationForSite('site-nineveh-dominican-church')[0].documentation, 'modeled');
  assert.ok(documentationForSite('site-nineveh-old-mosul').length >= 5);
  assert.ok(documentationForSite('site-duhok-delal-bridge').length >= 1);
});

test('unclassified or unknown-creator resources are never shown', () => {
  const base = { creatorTypes: ['independent'], creators: { a: { name: 'A', type: 'independent' } }, methods: { photogrammetry: 'Photogrammetry' } };
  const r = (over) => ({ provider: 'sketchfab', modelId: 'a'.repeat(32), title: 'T', creator: 'a', documentation: 'measured', method: 'photogrammetry',
    methodEvidence: 'inferred', sites: [{ siteId: 's', relation: 'site' }], ...over });
  assert.equal(documentationForSite('s', { ...base, resources: [r({})] }).length, 1);
  assert.equal(documentationForSite('s', { ...base, resources: [r({ documentation: 'unknown' })] }).length, 0);
  assert.equal(documentationForSite('s', { ...base, resources: [r({ methodEvidence: undefined })] }).length, 0);
  assert.equal(documentationForSite('s', { ...base, resources: [r({ creator: 'b' })] }).length, 0);
  assert.equal(documentationForSite('s', { ...base, resources: [r({ modelId: 'not-a-model' })] }).length, 0);
});

test('3D documentation never decides whether a card is published, and marks cards that have it', () => {
  const sites = getAllSites();
  assert.equal(sites.length, records.filter((record) => isVisibleCard(record)).length);
  const withDocs = sites.filter((site) => site.modelResources.some((resource) => resource.documentation));
  assert.ok(withDocs.length >= 25);
  for (const site of withDocs) assert.equal(site.hasModel, true, site.id);
});

test('the viewer states the class, method and evidence and loads nothing before the visitor asks', () => {
  const [resource] = documentationForSite('site-nineveh-dominican-church');
  const html = renderToStaticMarkup(React.createElement(ModelViewer, { resource, siteId: 'site-nineveh-dominican-church', name: 'Dominican Church' }));
  assert.match(html, /data-documentation="modeled"/);
  assert.match(html, /Modelled or reconstructed/);
  assert.match(html, /Manual 3D modelling/);
  assert.match(html, /Method judged from the model; the creator does not state it:/);
  assert.ok(!html.includes('<iframe'), 'Sketchfab loads only on request');
});
