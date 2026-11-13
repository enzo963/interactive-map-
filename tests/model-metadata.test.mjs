import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const models = await server.ssrLoadModule('/src/utils/modelResources.js');
const approved = (extra = {}) => ({ id: 'site-a', status: 'approved', ...extra });
const asset = (extra = {}) => ({ type: '3d', url: '/models/a.glb', verification_status: 'verified', ...extra });

test('model metadata normalizes aliases without inventing unknown provenance', () => {
  const [resource] = models.normalizeModelResources(approved({ digital_assets: [asset({
    id: 'model-a', title: 'Temple', creator: 'Institute', creation_method: 'Photogrammetry', year: 2024,
    source_name: 'Archive', source_url: 'https://example.org/source', file_size_bytes: 2048,
  })] }));
  assert.deepEqual(Object.fromEntries(['id', 'title', 'siteId', 'creator', 'creationMethod', 'year', 'sourceName', 'sourceUrl', 'format', 'fileSizeBytes', 'verificationStatus'].map((key) => [key, resource[key]])), {
    id: 'model-a', title: 'Temple', siteId: 'site-a', creator: 'Institute', creationMethod: 'Photogrammetry', year: 2024,
    sourceName: 'Archive', sourceUrl: 'https://example.org/source', format: 'GLB', fileSizeBytes: 2048, verificationStatus: 'verified',
  });
  assert.equal(resource.creation_method, 'Photogrammetry');
  assert.equal(resource.file_size_bytes, 2048);
  const [unknown] = models.normalizeModelResources(approved({ has3D: true, model_3d_url: '/models/a.obj' }));
  for (const key of ['creator', 'creationMethod', 'sourceName', 'sourceUrl']) assert.equal(unknown[key], '');
  assert.equal(unknown.year, null);
  assert.equal(unknown.fileSizeBytes, null);
  assert.equal(unknown.format, 'OBJ');
});

test('model metadata rejects invalid numeric values and unsafe source links', () => {
  for (const bad of [-1, 1.1, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '2048']) {
    const [resource] = models.normalizeModelResources(approved({ digital_assets: [asset({ file_size_bytes: bad })] }));
    assert.equal(resource.fileSizeBytes, null);
  }
  for (const bad of [0, -100, 10000, 2024.2, '2024-01-01', '2024']) {
    const [resource] = models.normalizeModelResources(approved({ digital_assets: [asset({ year: bad })] }));
    assert.equal(resource.year, null);
  }
  const [resource] = models.normalizeModelResources(approved({ digital_assets: [asset({ source_url: 'javascript:alert(1)', file_size_bytes: 0, year: 1 })] }));
  assert.equal(resource.sourceUrl, '');
  assert.equal(resource.fileSizeBytes, 0);
  assert.equal(resource.year, 1);
});

test('primary metadata never promotes missing legacy evidence or overrides site binding', () => {
  const metadata = { title: 'Survey', creator: 'Team', verification_status: 'verified' };
  assert.deepEqual(models.normalizeModelResources(approved({ model_3d_url: '/a.glb', model_metadata: metadata })), []);
  assert.deepEqual(models.normalizeModelResources(approved({ has3D: true, model_3d_url: '/a.glb', model_metadata: { ...metadata, siteId: 'other' } })), []);
  assert.deepEqual(models.normalizeModelResources(approved({ has3D: true, model_3d_url: '/a.glb', model_metadata: { verificationStatus: 'unverified' } })), []);
  const [resource] = models.normalizeModelResources(approved({ has3D: true, model_3d_url: '/a.glb', model_metadata: metadata }));
  assert.equal(resource.creator, 'Team');
  assert.equal(resource.title, 'Survey');
  assert.equal(resource.verified, true);
});

test('library rechecks eligibility, binding, permission and canonical duplicate URLs', () => {
  const resource = models.normalizeModelResources(approved({ digital_assets: [asset()] }))[0];
  const site = approved({ name: 'Temple', modelResources: [resource, { ...resource, url: '/models/a.glb#same' }] });
  const rows = models.getModelLibrary([site, site, approved({ id: 'draft', status: 'draft', modelResources: [resource] }),
    approved({ id: 'wrong', modelResources: [resource] }), approved({ modelResources: [{ ...resource, verified: false }] }),
    approved({ modelResources: [{ ...resource, siteId: '' }] }), approved({ modelResources: [{ ...resource, license_status: 'restricted' }] }),
    approved({ modelResources: [{ ...resource, url: 'javascript:bad' }] })]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].site, site);
  assert.equal(rows[0].resource, resource);
  assert.equal(typeof rows[0].key, 'string');
});

test('library search folds Unicode and matches all words across site and model metadata', () => {
  const entries = [{ key: 'a', site: { name: 'Hatra', aliases: ['Ḥaṭrā'], governorate: 'Nineveh' }, resource: { title: 'Temple', creator: 'Musée Team', creationMethod: 'Photogrammetry', format: 'GLB', sourceName: 'Archive', year: 2024 } }];
  for (const query of ['hatra musée', 'nineveh glb', 'archive 2024', 'photogrammetry team']) assert.deepEqual(models.searchModelLibrary(entries, query), entries);
  assert.deepEqual(models.searchModelLibrary(entries, 'hatra missing'), []);
  assert.deepEqual(models.searchModelLibrary(entries, ''), entries);
});

test('shared model information renders canonical fields and uncertain licensing honestly', async () => {
  const { default: ModelMetadata } = await server.ssrLoadModule('/src/components/site/ModelMetadata.jsx');
  const html = renderToStaticMarkup(React.createElement(ModelMetadata, { resource: { title: 'Temple', creator: 'Team', creationMethod: 'Survey', year: 2024, format: 'GLB', fileSizeBytes: 2048, verificationStatus: 'verified', license: 'CC BY', sourceName: 'Archive', sourceUrl: 'javascript:bad' } }));
  assert.match(html, /<details class="hb-model__information"><summary>Model information<\/summary>/);
  for (const text of ['Creator', 'Team', 'Creation method', 'Survey', '2024', 'Archive', 'GLB', '2,048 bytes', 'Verification status', 'Verified']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('License unverified; reuse permission has not been confirmed.'));
  assert.ok(!html.includes('href="javascript:'));
  const unknown = renderToStaticMarkup(React.createElement(ModelMetadata, { resource: {} }));
  assert.ok(unknown.includes('Not recorded'));
  assert.ok(unknown.includes('License unknown; reuse permission has not been confirmed.'));
});
