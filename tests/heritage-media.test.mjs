import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const load = () => server.ssrLoadModule('/src/utils/heritageMedia.js');
const source = { evidenceId: 'report', sourceName: 'UNESCO', url: 'https://whc.unesco.org/en/list/1', accessedAt: '2020-02-29', accessLevel: 'full-text' };
const claim = { id: 'archive', type: 'archival-image', title: 'Recorded view', description: 'Reviewed account', siteId: 'site', verification_status: 'verified', reviewedBy: 'Editor', reviewedAt: '2020-03-01', sourceRefs: ['report'] };
const published = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url))).find((s) => s.status === 'approved' && s.coverImage);
const image = () => { const value = structuredClone(published.coverImage); value.siteId = 'site'; value.publication_approval.siteId = 'site'; return value; };
const site = (media, extra = {}) => ({ id: 'site', status: 'approved', sources: [source], heritage_media: [media], ...extra });
const media = (extra = {}) => ({ ...image(), ...claim, date: 'c. 1910–1920', ...extra });

test('typed archive retains authored dates, independent rights and evidence without mutation', async () => {
  const { normalizeHeritageMedia: normalize, MEDIA_TYPES, getArchivalImages } = await load();
  assert.deepEqual(MEDIA_TYPES.map((t) => t.id), ['photograph', 'archival-image', 'reconstruction', 'panorama', 'video', '3d']);
  const raw = site(media()); const before = structuredClone(raw); const [resource] = normalize(raw);
  assert.equal(resource.dateLabel, 'c. 1910–1920'); assert.equal(resource.date, 'c. 1910–1920');
  assert.equal(resource.verified, true); assert.equal(resource.sources[0].evidenceId, 'report');
  assert.deepEqual(raw, before);
  assert.equal(getArchivalImages([{ ...raw, heritageMedia: [resource] }]).length, 1);
  assert.equal(getArchivalImages([{ ...raw, status: 'draft', heritageMedia: [resource] }]).length, 0);
  assert.deepEqual(normalize({ ...raw, heritage_media: undefined, galleryImages: [media()] }), []);
});

test('claims and image rights independently fail closed', async () => {
  const { normalizeHeritageMedia: normalize } = await load();
  for (const bad of [{ siteId: 'other' }, { verificationStatus: 'draft' }, { verified: false }, { reviewedAt: '2020-02-30' }, { sourceRefs: ['missing'] }, { reviewedBy: '' }, { license_status: 'unknown' }, { licenseStatus: 'restricted' }, { credit: '' }, { sourceUrl: 'javascript:bad' }, { date: '<b>1900</b>' }, { date: '1900-02-30' }, { year: 0 }, { year: 9999 }]) {
    assert.deepEqual(normalize(site(media(bad))), [], JSON.stringify(bad));
  }
  assert.deepEqual(normalize(site(media(), { sources: [{ ...source, accessLevel: 'search-snippet' }] })), []);
  const changed = media(); changed.license_review.evidence[0].evidenceId = 'unbound';
  assert.deepEqual(normalize(site(changed)), []);
});

test('video and model keep safe viewers and unknown rights, dates never derive from names', async () => {
  const { normalizeHeritageMedia: normalize } = await load();
  for (const [type, url] of [['video', 'https://youtu.be/abcdefghi'], ['3d', '/models/1900.glb']]) {
    const [resource] = normalize(site({ ...claim, type, url, year: -500 }));
    assert.equal(resource.date, null); assert.equal(resource.dateLabel, '500 BCE'); assert.equal(resource.year, -500);
    assert.equal(resource.verificationStatus, 'verified');
    assert.deepEqual(normalize(site({ ...claim, type, url: 'javascript:alert(1)' })), []);
    assert.deepEqual(normalize(site({ ...claim, type, url, license_status: 'restricted' })), []);
  }
});

test('numeric dates preserve precision and reject future starts or conflicting years', async () => {
  const { normalizeHeritageMedia: normalize } = await load();
  const today = new Date(); const currentYear = today.getUTCFullYear();
  const tomorrow = new Date(Date.UTC(currentYear, today.getUTCMonth(), today.getUTCDate() + 1)).toISOString().slice(0, 10);
  const nextMonth = new Date(Date.UTC(currentYear, today.getUTCMonth() + 1, 1)).toISOString().slice(0, 7);
  for (const date of [tomorrow, nextMonth]) assert.deepEqual(normalize(site(media({ date }))), [], date);
  for (const date of ['1900', '1900-02', '1900-02-01']) {
    assert.deepEqual(normalize(site(media({ date, year: 1901 }))), [], date);
    assert.equal(normalize(site(media({ date, year: 1900 })))[0].date, date);
  }
  assert.deepEqual(normalize(site(media({ date: ' 1900-02 ', year: 1901 }))), []);
  assert.equal(normalize(site(media({ date: String(currentYear), year: currentYear })))[0].date, String(currentYear));
});

test('any same-site restricted image observation blocks all occurrences independent of order', async () => {
  const { normalizeHeritageMedia: normalize, getRestrictedHeritageMediaUrls } = await load();
  const allowed = media();
  const restricted = media({ id: 'restricted', verification_status: 'draft', source_observations: [{ license_status: 'restricted' }] });
  const expected = new URL(allowed.src); expected.hash = '';
  for (const resources of [[allowed, restricted], [restricted, allowed]]) {
    const raw = site(allowed, { heritage_media: resources }); const before = structuredClone(raw);
    assert.deepEqual(normalize(raw), []);
    assert.deepEqual([...getRestrictedHeritageMediaUrls(raw)], [expected.href]);
    assert.deepEqual(raw, before);
  }
  assert.equal(normalize(site(allowed, { heritage_media: [allowed, { ...restricted, siteId: 'other' }] })).length, 1);
  assert.deepEqual([...getRestrictedHeritageMediaUrls(null)], []);
});
