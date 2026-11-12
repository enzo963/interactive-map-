import { checkCardReadiness } from './cardReadiness';
import { approvedCover } from './coverApproval';
import { crediblePublishers } from './sourceCredibility';
import { hasVerifiedPosition } from './mapPosition';
import { getGovernorateKey } from '../data/governorates';

/**
 * Coverage per governorate, computed with the same rules the site uses, so the report and the
 * published archive can never disagree. Used by scripts/coverage-report.mjs (npm run report:coverage).
 *
 * Columns:
 *   discovered  distinct records found for the governorate (discovery batches and the archive, before merges)
 *   approved    records with status `approved`
 *   published   visible cards (card contract met, status needs-review or approved)
 *   image       published cards with an approved primary image (approvedCover)
 *   gallery     published cards with at least one approved gallery image
 *   coordinates published cards with verified latitude and longitude
 *   multiSource published cards with two or more distinct credible publishers (tiers 1–3)
 *   review      records still needing review (status needs-review or draft)
 */
export const COVERAGE_GOVERNORATES = [
  ['nineveh', 'Nineveh'], ['duhok', 'Duhok'], ['erbil', 'Erbil'], ['sulaymaniyah', 'Sulaymaniyah'], ['kirkuk', 'Kirkuk'],
  ['salahaldin', 'Salah al-Din'], ['diyala', 'Diyala'], ['baghdad', 'Baghdad'], ['anbar', 'Anbar'],
];

/** Shares of published cards that measure how complete a governorate is; their mean ranks the governorates. */
export const COVERAGE_RATES = [
  ['approved', 'Approved'],
  ['image', 'Primary image'],
  ['gallery', 'Gallery'],
  ['coordinates', 'Coordinates'],
  ['multiSource', 'Multiple sources'],
];

export const approvedGalleryImage = (image, siteId) => image?.license_status === 'verified'
  && image.publication_approval?.status === 'approved' && (!image.siteId || image.siteId === siteId);
const hasCoordinates = hasVerifiedPosition;

/**
 * records:    the archive (src/data/sites.json)
 * discovered: candidate records from the discovery batches; only `id` and `governorate` are read
 */
export function coverageByGovernorate(records, discovered = []) {
  const rows = COVERAGE_GOVERNORATES.map(([key, name]) => ({
    key, name, discovered: 0, archived: 0, approved: 0, published: 0, image: 0, gallery: 0, coordinates: 0, multiSource: 0, review: 0,
  }));
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
  const seen = new Set();
  for (const candidate of [...records, ...discovered]) {
    const row = byKey[getGovernorateKey(candidate?.governorate)];
    if (!row || !candidate.id || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    row.discovered += 1;
  }
  for (const record of records) {
    const row = byKey[getGovernorateKey(record.governorate)];
    if (!row) continue;
    row.archived += 1;
    if (record.status === 'approved') row.approved += 1;
    if (['needs-review', 'draft'].includes(record.status)) row.review += 1;
    if (!checkCardReadiness(record).visible) continue;
    row.published += 1;
    if (approvedCover(record)) row.image += 1;
    if ((record.galleryImages ?? []).some((image) => approvedGalleryImage(image, record.id))) row.gallery += 1;
    if (hasCoordinates(record)) row.coordinates += 1;
    if (crediblePublishers(record.sources).size >= 2) row.multiSource += 1;
  }
  for (const row of rows) {
    row.rates = Object.fromEntries(COVERAGE_RATES.map(([key]) => [key, row.published ? row[key] / row.published : 0]));
    row.score = COVERAGE_RATES.reduce((sum, [key]) => sum + row.rates[key], 0) / COVERAGE_RATES.length;
  }
  const ranked = [...rows].sort((a, b) => a.score - b.score);
  ranked.forEach((row, index) => { row.rank = rows.length - index; }); // 1 = most complete
  // Every governorate tied for the lowest share of a measure (shares are compared on exact counts).
  const lowest = Object.fromEntries(COVERAGE_RATES.map(([key]) => {
    const min = Math.min(...rows.map((row) => row.rates[key]));
    return [key, rows.filter((row) => Math.abs(row.rates[key] - min) < 1e-9).map((row) => row.key)];
  }));
  const totals = rows.reduce((sum, row) => {
    for (const key of ['discovered', 'archived', 'approved', 'published', 'image', 'gallery', 'coordinates', 'multiSource', 'review']) sum[key] += row[key];
    return sum;
  }, { discovered: 0, archived: 0, approved: 0, published: 0, image: 0, gallery: 0, coordinates: 0, multiSource: 0, review: 0 });
  return { rows, totals, lagging: ranked[0].key, lowest };
}
