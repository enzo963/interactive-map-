import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const schema = read('../src/data/sites.schema.json');
const frontend = read('../src/data/sites.json');
const catalogPath = new URL('../tools/content-pipeline/data/prepared/heritage-sites.json', import.meta.url);
const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : null;
const validate = new Ajv({ allErrors: true }).compile(schema);
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
after(async () => { await server.close(); });
const cover = { src: '/cover.jpg', alt: 'Cover view', caption: '', credit: 'Cover credit', license: 'CC BY' };
const detail = { src: '/detail.jpg', alt: 'Detail view', caption: 'Detail', credit: '', license: '' };

// Fresh checkouts do not contain ignored collection data. The optional catalog
// check is skipped there; frontend/media tests remain fully reproducible.
test('frontend data obeys the shared schema with unique IDs', () => {
  assert.ok(validate(frontend), JSON.stringify(validate.errors));
  assert.equal(new Set(frontend.map(record => record.id)).size, frontend.length);
  assert.equal(Object.hasOwn(frontend[0], 'images'), false);
});

test('every required schema field is enforced', () => {
  for (const field of schema.items.required) {
    const record = structuredClone(frontend[0]); delete record[field];
    assert.equal(validate([record]), false, field);
  }
});

test('prepared review catalog uses the same schema without duplicate Hatra', { skip: !catalog }, () => {
  assert.ok(validate(catalog), JSON.stringify(validate.errors));
  assert.equal(new Set(catalog.map(record => record.id)).size, catalog.length);
  assert.equal(catalog.filter(record => record.name === 'Hatra').length, 1);
  assert.equal(catalog.find(record => record.name === 'Hatra').id, 'site-001');
  assert.ok(catalog.every(record => record.status === 'needs-review' && record.verification.review_required));
});

test('schema permits unknown flags and rejects strings and incomplete images/sources', () => {
  const record = { ...frontend[0], unesco: null, has3D: null, coverImage: cover, galleryImages: [detail] };
  assert.ok(validate([record]), JSON.stringify(validate.errors));
  assert.equal(validate([{ ...record, unesco: 'false' }]), false);
  assert.equal(validate([{ ...record, coverImage: { src: '/image.jpg' } }]), false);
  assert.equal(validate([{ ...record, sources: [{ sourceName: 'Reference', url: '' }] }]), false);
});

test('adapter separates the cover and gallery while preserving UI aliases', () => {
  const raw = { ...frontend[0], coverImage: cover, galleryImages: [detail] };
  const copy = structuredClone(raw);
  const site = normalizeSites([raw])[0];
  assert.equal(site.image, cover.src);
  assert.equal(site.imageAlt, cover.alt);
  assert.equal(site.imageCredit, cover.credit);
  assert.equal(site.mediaLicense, cover.license);
  assert.deepEqual(site.coverImage, cover);
  assert.deepEqual(site.galleryImages, [detail]);
  assert.deepEqual(site.gallery, [detail]);
  assert.deepEqual(site.images, [cover, detail]);
  assert.deepEqual(raw, copy);
});

test('explicitly unassigned covers remain unassigned and repeated covers deduplicate', () => {
  const unassigned = normalizeSites([{ ...frontend[0], coverImage: null, galleryImages: [detail] }])[0];
  assert.equal(unassigned.image, null);
  assert.deepEqual(unassigned.gallery, [detail]);
  const repeated = normalizeSites([{ ...frontend[0], coverImage: cover, galleryImages: [cover, detail] }])[0];
  assert.equal(repeated.images.length, 2);
  assert.equal(repeated.gallery.length, 2);
});

test('unknown canonical flags are preserved while boolean UI predicates remain false', () => {
  const site = normalizeSites([{ ...frontend[0], unesco: null, unesco_status: '', has3D: null }])[0];
  assert.equal(site.unesco, null);
  assert.equal(site.has3D, null);
  assert.equal(site.isUnesco, false);
  assert.equal(site.hasModel, false);
});

test('legacy combined and snake-case images stay readable', () => {
  const raw = { id: 'legacy', name: 'Legacy', governorate: 'Erbil', site_type: 'Citadel', historical_period: 'Ottoman', images: [cover, detail], unesco_status: 'tentative', has_3d: false };
  const combined = normalizeSites([raw])[0];
  assert.equal(combined.image, cover.src);
  assert.deepEqual(combined.gallery, [cover, detail]);
  const { images, ...legacy } = raw;
  assert.equal(images.length, 2);
  const snakeCase = normalizeSites([{ ...legacy, main_image: cover, gallery: [detail] }])[0];
  assert.equal(snakeCase.image, cover.src);
  assert.deepEqual(snakeCase.gallery, [detail]);
  assert.equal(snakeCase.category, 'Citadel');
  assert.equal(snakeCase.period, 'Ottoman');
});

test('approved dataset import preserves Hatra identity and its existing route', () => {
  const old = JSON.parse(execFileSync('git', ['show', 'HEAD:src/data/sites.json'], { encoding: 'utf8' }));
  const before = normalizeSites(old).find((s) => s.id === 'site-001');
  const current = normalizeSites(frontend).find((s) => s.id === 'site-001');
  for (const key of ['id', 'slug', 'href', 'name', 'governorate', 'siteType', 'period', 'isUnesco']) assert.deepEqual(current[key], before[key], key);
  assert.equal(frontend.length, 34);
  assert.ok(frontend.every((s) => s.status === 'approved' && s.sources.length));
});


test('image license states accept the four documented values and reject other claims', () => {
  for (const license_status of ['verified', 'unverified', 'restricted', 'unknown']) {
    assert.ok(validate([{ ...frontend[0], coverImage: { ...cover, license_status } }]));
  }
  assert.equal(validate([{ ...frontend[0], coverImage: { ...cover, license_status: 'safe' } }]), false);
});
