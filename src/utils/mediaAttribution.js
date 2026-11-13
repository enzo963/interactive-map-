import { safeUrl } from './urls.js';

const nonempty = (value) => typeof value === 'string' && Boolean(value.trim());
export const reviewedDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10);
};
export function mediaKey(value) {
  const url = safeUrl(value, { allowRelative: true });
  return url ? url.split('#')[0] : '';
}

export const attributionFields = (asset) => Object.fromEntries([
  'siteId', 'license_status', 'licenseStatus', 'license_url', 'license_review', 'license_tracking',
  'publication_approval', 'sourceName', 'sourceUrl', 'source_name', 'source_url', 'source_observations',
].filter((key) => Object.hasOwn(asset, key)).map((key) => [key, asset[key]]));

function boundEvidence(media, observations, key) {
  const evidence = media.license_review?.evidence;
  const checks = media.license_tracking?.evidence_checks;
  if (!Array.isArray(evidence) || !evidence.length || !Array.isArray(checks) || !checks.length) return false;
  const matches = (item, check) => item && nonempty(item.evidenceId)
    && mediaKey(item.resource_url ?? item.image_url) === key
    && safeUrl(item.source_url) && check?.valid === true
    && check.source?.evidenceId === item.evidenceId
    && safeUrl(check.source.url) === safeUrl(item.source_url);
  return evidence.every((item) => checks.some((check) => matches(item, check)))
    && checks.every((check) => evidence.some((item) => matches(item, check)))
    && observations.every((item) => {
      const source = item.sourceUrl || item.source_url;
      return !source || (safeUrl(source) && evidence.some((entry) => safeUrl(entry?.source_url) === safeUrl(source)));
    });
}

/** Verification is specific to the terms and media URL; a label or model flag is insufficient. */
export function mediaLicenseState(media = {}) {
  const observations = [media, ...(Array.isArray(media.source_observations) ? media.source_observations : [])]
    .filter((item) => item && typeof item === 'object');
  const states = observations.flatMap((item) => [item.license_status, item.licenseStatus].filter(Boolean));
  if (states.includes('restricted') || observations.some((item) => item.license_review?.permission === 'restricted')) return 'restricted';
  const review = media.license_review;
  const tracking = media.license_tracking;
  const key = mediaKey(media.src || media.url);
  if (states.length && states.every((state) => state === 'verified') && key
    && review?.permission === 'publication-permitted' && nonempty(media.license)
    && nonempty(review.license) && review.license.trim() === media.license.trim()
    && nonempty(review.reviewedBy) && reviewedDate(review.reviewedAt)
    && mediaKey(review.resource_url ?? review.image_url) === key
    && tracking?.evidence_valid === true && boundEvidence(media, observations, key)) return 'verified';
  return states.some((state) => ['unverified', 'verified'].includes(state)) || nonempty(media.license) ? 'unverified' : 'unknown';
}
