import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const Ajv = createRequire(import.meta.url)('ajv');
const validate = new Ajv({ allErrors: true, format: 'full' }).compile(JSON.parse(readFileSync(new URL('../src/data/sites.schema.json', import.meta.url))));
const record = { id: 'site', name: 'Site', governorate: '', category: '', period: '', description: '', unesco: null, has3D: null, coverImage: null, galleryImages: [], sources: [] };
const media = { id: 'archive', type: 'archival-image', title: 'View', description: '', siteId: 'site', verification_status: 'draft', reviewedBy: 'Editor', reviewedAt: '2020-01-01', sourceRefs: ['report'], src: 'https://example.org/image.jpg', date: null, year: -500 };
test('optional typed media supports drafts, historic text and unknown dates', () => {
  assert.ok(validate([record]));
  for (const date of [null, '1900', '1900-02', 'c. 1900–1910', '500 BCE']) assert.ok(validate([{ ...record, heritage_media: [{ ...media, date }] }]), JSON.stringify(validate.errors));
});
test('typed media schema rejects missing review, unsupported kinds and unsafe fields', () => {
  for (const key of ['id', 'type', 'title', 'siteId', 'reviewedBy', 'reviewedAt', 'sourceRefs', 'verification_status']) {
    const changed = { ...media }; delete changed[key]; assert.equal(validate([{ ...record, heritage_media: [changed] }]), false, key);
  }
  for (const bad of [{ type: 'guess' }, { sourceRefs: [] }, { src: 'javascript:bad' }, { date: '<b>1900</b>' }, { year: 0 }, { verified: 'yes' },
    { license_review: { evidence: [{ image_url: 'javascript:bad' }] } }, { license_tracking: { evidence_valid: 'yes' } },
    { publication_approval: { site_verified: 'yes' } }]) assert.equal(validate([{ ...record, heritage_media: [{ ...media, ...bad }] }]), false, JSON.stringify(bad));
});
