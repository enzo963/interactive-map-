import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { normalizeComparisons } = await server.ssrLoadModule('/src/utils/comparisons.js');
after(async () => server.close());

const records = JSON.parse(await readFile(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const photos = records.filter((s) => s.status === 'approved').flatMap((s) => [s.coverImage, ...s.galleryImages].filter(Boolean));
function fixture() {
  const images = photos.slice(0, 2).map((original) => {
    const image = structuredClone(original);
    image.siteId = 'fixture';
    image.publication_approval = { status: 'approved', siteId: 'fixture', site_verified: true, image_url: image.src, reviewedBy: 'Test reviewer', reviewedAt: '2026-11-01' };
    return image;
  });
  const pair = { id: 'pair', title: 'Authored comparison', type: 'historical-current', verification_status: 'verified', before: { image: images[0].src, label: 'Archive view', date: 'c. 1930' }, after: { image: images[1].src, label: 'Current view', date: '2024' }, notes: 'Different perspectives.' };
  return { images, raw: { id: 'fixture', status: 'approved', comparisons: [pair] } };
}
test('only explicit reviewed pairs resolve real images and retain authored dates', () => {
  const { raw, images } = fixture();
  const [pair] = normalizeComparisons(raw, images);
  assert.ok(pair); assert.equal(pair.verified, true); assert.equal(pair.siteId, raw.id);
  assert.equal(pair.before.image, images[0]); assert.equal(pair.before.date, 'c. 1930');
  assert.equal(pair.after.image, images[1]); assert.equal(pair.after.date, '2024');
  assert.deepEqual(normalizeComparisons({ ...raw, comparisons: undefined }, images), []);
});
test('draft, unreviewed, cross-site, duplicated and incomplete pairs fail closed', () => {
  const changes = [
    (r) => { r.status = 'draft'; }, (r) => { delete r.comparisons[0].verification_status; },
    (r) => { r.comparisons[0].verified = false; },
    (r) => { r.comparisons[0].siteId = 'other'; }, (r) => { r.comparisons[0].type = 'guess'; },
    (r) => { r.comparisons[0].after.image = r.comparisons[0].before.image; },
    (r) => { r.comparisons[0].before.image = 'https://example.org/missing.jpg'; },
    (r) => { r.comparisons[0].before.date = 1930; }, (r) => { r.comparisons[0].before.label = '<script>bad</script>'; },
    (r) => { r.comparisons[0].before.kind = 'unknown'; },
  ];
  for (const change of changes) { const { raw, images } = fixture(); change(raw); assert.deepEqual(normalizeComparisons(raw, images), []); }
});
test('missing dates stay unknown and legacy approval is supported without promoting contradictory pair review', () => {
  const { raw, images } = fixture(); delete raw.status; raw.verification_status = 'approved';
  delete raw.comparisons[0].before.date; raw.comparisons[0].after.date = null;
  const [pair] = normalizeComparisons(raw, images); assert.ok(pair);
  assert.equal(pair.before.date, ''); assert.equal(pair.after.date, '');
  raw.comparisons[0].verificationStatus = 'draft';
  assert.deepEqual(normalizeComparisons(raw, images), []);
  raw.comparisons[0].verificationStatus = 'approved';
  assert.equal(normalizeComparisons(raw, images).length, 1);
  raw.comparisons[0].verification_status = 'draft';
  assert.deepEqual(normalizeComparisons(raw, images), []);
});
test('unsafe and nonstring provided dates are rejected instead of silently erased', () => {
  for (const date of [1930, {}, '\n', '1930\nunsafe', '<time>1930</time>']) {
    const { raw, images } = fixture(); raw.comparisons[0].before.date = date;
    assert.deepEqual(normalizeComparisons(raw, images), []);
  }
});
test('licensing and image-specific publication approval must both be strong and site-bound', () => {
  const changes = [
    (i) => { i.siteId = 'other'; }, (i) => { i.license_status = 'unknown'; },
    (i) => { i.license_review.evidence[0].evidenceId = 'not-audited'; },
    (i) => { delete i.license_tracking.evidence_checks[0].source; },
    (i) => { i.publication_approval.status = 'draft'; }, (i) => { i.publication_approval.site_verified = false; },
    (i) => { i.publication_approval.siteId = 'other'; }, (i) => { i.publication_approval.image_url = 'https://example.org/replaced.jpg'; },
    (i) => { i.src = 'javascript:alert(1)'; },
  ];
  for (const change of changes) { const { raw, images } = fixture(); change(images[0]); assert.deepEqual(normalizeComparisons(raw, images), []); }
});
test('reconstruction pairs require explicit photograph and reconstruction labels', () => {
  const { raw, images } = fixture(); const pair = raw.comparisons[0]; pair.type = 'reconstruction';
  assert.deepEqual(normalizeComparisons(raw, images), []);
  pair.before.kind = 'photograph'; pair.after.kind = 'reconstruction';
  assert.equal(normalizeComparisons(raw, images)[0].after.kind, 'reconstruction');
  pair.before.kind = 'reconstruction';
  assert.equal(normalizeComparisons(raw, images).length, 1, 'Two reviewed interpretations remain comparable when both are labeled as reconstructions');
  pair.before.kind = 'photograph'; pair.after.kind = 'photograph';
  assert.deepEqual(normalizeComparisons(raw, images), [], 'A reconstruction comparison needs at least one explicitly labeled reconstruction');
});
