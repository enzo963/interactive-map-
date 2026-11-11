// Approval is image-specific. License verification alone is not publication approval.
const reviewedDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10);
};
const nonEmptyText = (value) => typeof value === 'string' && Boolean(value.trim());
const imageKey = (value) => {
  if (!nonEmptyText(value) || /[\s\\]/.test(value) || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
};
/** The cover a card may show, or null. Requires verified licensing evidence and an image/site publication approval. */
export function approvedCover(site) {
  const cover = site.coverImage;
  if (!cover || cover.siteId !== site.id || cover.license_status !== 'verified' || (cover.licenseStatus && cover.licenseStatus !== 'verified')) return null;
  const src = imageKey(cover.src);
  const review = cover.license_review;
  const tracking = cover.license_tracking;
  const approval = cover.publication_approval;
  if (!src || !review || review.permission !== 'publication-permitted' || !nonEmptyText(review.license)
    || !nonEmptyText(review.reviewedBy) || !reviewedDate(review.reviewedAt) || imageKey(review.image_url) !== src
    || !Array.isArray(review.evidence) || review.evidence.length === 0
    || tracking?.evidence_valid !== true || !Array.isArray(tracking.evidence_checks) || tracking.evidence_checks.length === 0
    || !tracking.evidence_checks.every((check) => check.valid === true)
    || approval?.status !== 'approved' || approval.siteId !== site.id || approval.site_verified !== true
    || imageKey(approval.image_url) !== src || !nonEmptyText(approval.reviewedBy) || !reviewedDate(approval.reviewedAt)) return null;
  return cover;
}
