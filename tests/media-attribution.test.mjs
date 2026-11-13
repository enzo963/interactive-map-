import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { mediaLicenseState } from '../src/utils/mediaAttribution.js';
import { safeUrl } from '../src/utils/urls.js';

const records = JSON.parse(await readFile(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const published = records.filter((site) => site.status === 'approved');
const photos = published.flatMap((site) => [site.coverImage, ...site.galleryImages].filter(Boolean));

test('published records retain reference attribution and every current photo has bound licensing evidence', () => {
  assert.ok(photos.length > 0);
  for (const site of published) {
    assert.ok(site.sources.length > 0, site.id);
    for (const source of site.sources) {
      assert.ok(source.sourceName.trim(), site.id);
      assert.ok(safeUrl(source.url), site.id);
    }
  }
  for (const image of photos) {
    assert.ok(image.credit.trim());
    assert.ok(safeUrl(image.sourceUrl));
    assert.ok(safeUrl(image.license_url) || /^(Public domain|Copyrighted free use)$/.test(image.license));
    assert.equal(mediaLicenseState(image), 'verified', image.src);
  }
});

test('replaced, incomplete or unmatched evidence cannot inherit an old verified flag', () => {
  const image = photos[0];
  for (const mutate of [
    (media) => { media.license_review.evidence[0].evidenceId = 'never-audited'; },
    (media) => { media.license_review.evidence[0].image_url = 'https://example.org/different.jpg'; },
    (media) => { media.license_review.evidence[0].source_url = 'https://example.org/unrelated'; },
    (media) => { delete media.license_tracking.evidence_checks[0].source; },
    (media) => { media.license_tracking.evidence_checks[0].source.evidenceId = 'different'; },
    (media) => { media.sourceUrl = 'https://example.org/replaced-source'; },
    (media) => { media.license_review.evidence = [null]; },
    (media) => { media.license_tracking.evidence_checks = [null]; },
  ]) {
    const changed = structuredClone(image);
    mutate(changed);
    assert.equal(mediaLicenseState(changed), 'unverified');
  }
});
