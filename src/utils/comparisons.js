import { approvedCover } from './coverApproval.js';
import { mediaKey, mediaLicenseState } from './mediaAttribution.js';
import { isApprovedSite } from './modelResources';

const types = new Set(['historical-current', 'reconstruction', 'pre-post-destruction']);
const kinds = new Set(['photograph', 'reconstruction']);
// React escapes authored text; rejecting markup/control characters also keeps this metadata reusable.
const safeText = (value) => typeof value === 'string' && !/[<>]/.test(value)
  && ![...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
const text = (value) => safeText(value) ? value.trim() : '';

/** Explicit editorial pairs only. Neither gallery order nor dates create a comparison. */
export function normalizeComparisons(raw, normalizedImages) {
  if (!raw || !isApprovedSite(raw) || !Array.isArray(raw.comparisons) || !Array.isArray(normalizedImages)) return [];
  const imageFor = (reference) => {
    if (typeof reference !== 'string' || !mediaKey(reference)) return null;
    const image = normalizedImages.find((item) => item?.src === reference);
    if (!image || image.siteId !== raw.id || mediaLicenseState(image) !== 'verified'
      || !approvedCover({ id: raw.id, coverImage: image })) return null;
    return image;
  };
  const seen = new Set();
  return raw.comparisons.flatMap((pair) => {
    const statuses = pair ? ['verification_status', 'verificationStatus'].filter((key) => Object.hasOwn(pair, key)).map((key) => pair[key]) : [];
    if (!pair || pair.verified === false || !statuses.length || !statuses.every((value) => ['verified', 'approved'].includes(value)) || !types.has(pair.type)
      || (Object.hasOwn(pair, 'siteId') && pair.siteId !== raw.id)) return [];
    const id = text(pair.id); const title = text(pair.title);
    if (!id || !title || seen.has(id)) return [];
    const side = (item) => {
      if (!item || !text(item.label)
        || (item.date != null && !safeText(item.date))
        || (Object.hasOwn(item, 'kind') && !kinds.has(item.kind))
        || (pair.type === 'reconstruction' && !kinds.has(item.kind))) return null;
      const image = imageFor(item.image);
      return image ? { image, label: text(item.label), date: text(item.date), ...(item.kind ? { kind: item.kind } : {}) } : null;
    };
    const before = side(pair.before); const after = side(pair.after);
    if (!before || !after || mediaKey(before.image.src) === mediaKey(after.image.src)) return [];
    if (pair.type === 'reconstruction' && ![before.kind, after.kind].includes('reconstruction')) return [];
    seen.add(id);
    return [{ id, title, type: pair.type, siteId: raw.id, verified: true, before, after, notes: text(pair.notes) }];
  });
}
