import { getReviewedClaimSources } from './heritageExperience';
import { approvedCover } from './coverApproval';
import { attributionFields, mediaKey, mediaLicenseState } from './mediaAttribution';
import { getModelEmbed, getVideoEmbed } from './media';
import { isApprovedSite } from './modelResources';
import { safeUrl } from './urls';

export const MEDIA_TYPES = [
  { id: 'photograph', label: 'Photograph', isImage: true },
  { id: 'archival-image', label: 'Archival photograph', isImage: true },
  { id: 'reconstruction', label: 'Reconstruction render', isImage: true },
  { id: 'panorama', label: 'Panorama', isImage: true },
  { id: 'video', label: 'Video', isImage: false },
  { id: '3d', label: '3D resource', isImage: false },
];
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
const safeText = (value) => typeof value === 'string' && !/[<>]/.test(value)
  && ![...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
const text = (value) => safeText(value) ? value.trim() : '';
const types = new Map(MEDIA_TYPES.map((type) => [type.id, type]));
function historicDate(value, explicitYear) {
  const authored = text(value);
  if (!authored) return false;
  // Preserve authored precision; numeric calendar strings must be real dates.
  if (!/^\d{4}(?:-\d{2}){0,2}$/.test(authored)) return true;
  const [year, month = 1, day = 1] = authored.split('-').map(Number);
  if (explicitYear != null && year !== explicitYear) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const today = new Date().toISOString().slice(0, 10);
  const start = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return year > 0 && start <= today && month >= 1 && month <= 12
    && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Canonical URL keys for negative same-site image observations, including drafts. */
export function getRestrictedHeritageMediaUrls(raw) {
  const restricted = new Set();
  if (!record(raw) || !Array.isArray(raw.heritage_media)) return restricted;
  for (const asset of raw.heritage_media) {
    if (!record(asset) || !types.get(asset.type)?.isImage || asset.siteId == null
      || String(asset.siteId) !== String(raw.id) || mediaLicenseState(asset) !== 'restricted') continue;
    for (const value of [asset.src, asset.url]) {
      const key = mediaKey(value);
      if (key) restricted.add(key);
    }
  }
  return restricted;
}

/** Authored media types and dates require their own review; image rights have a separate gate. */
export function normalizeHeritageMedia(raw) {
  if (!record(raw) || !Array.isArray(raw.heritage_media)) return [];
  const seen = new Set();
  const restricted = getRestrictedHeritageMediaUrls(raw);
  return raw.heritage_media.flatMap((asset) => {
    if (!record(asset)) return [];
    const type = types.get(asset.type); const id = text(asset.id); const title = text(asset.title);
    const sources = getReviewedClaimSources(asset, raw);
    const year = asset.year ?? null;
    if (!type || !id || !title || seen.has(id) || !sources
      || (asset.description != null && !safeText(asset.description))
      || (asset.date != null && !historicDate(asset.date, year))
      || (year !== null && (!Number.isInteger(year) || year === 0 || year < -9999 || year > new Date().getUTCFullYear()))
      || mediaLicenseState(asset) === 'restricted') return [];
    const url = safeUrl(asset.src || asset.url, { allowRelative: true, httpsOnly: true });
    if (!url || (asset.src && asset.url && asset.src !== asset.url)
      || (type.isImage && restricted.has(mediaKey(url)))) return [];
    const image = { ...asset, src: url };
    if (type.isImage && (!text(asset.credit) || !text(asset.license)
      || !safeUrl(asset.sourceUrl ?? asset.source_url)
      || mediaLicenseState(image) !== 'verified' || !approvedCover({ id: raw.id, coverImage: image }))) return [];
    const embed = type.isImage ? null : (asset.type === 'video' ? getVideoEmbed(url) : getModelEmbed(url));
    if (!type.isImage && !embed) return [];
    const date = asset.date == null ? null : text(asset.date);
    seen.add(id);
    return [{ ...attributionFields(asset), id, type: asset.type, title, description: text(asset.description), siteId: String(raw.id),
      url, ...(type.isImage ? { src: url, alt: text(asset.alt) || title, caption: text(asset.caption) || text(asset.description) } : { kind: embed.type }),
      creator: text(asset.creator), creationMethod: text(asset.creationMethod ?? asset.creation_method),
      format: text(asset.format) || embed?.format || '', fileSizeBytes: Number.isSafeInteger(asset.fileSizeBytes) && asset.fileSizeBytes >= 0 ? asset.fileSizeBytes : null,
      date, dateLabel: date || (year === null ? '' : year < 0 ? `${Math.abs(year)} BCE` : String(year)), year,
      credit: text(asset.credit), license: text(asset.license), sourceName: text(asset.sourceName ?? asset.source_name),
      sourceUrl: safeUrl(asset.sourceUrl ?? asset.source_url) || '', sources, reviewedAt: asset.reviewedAt,
      verificationStatus: 'verified', verified: true }];
  });
}

/** Only normalized reviewed archival claims enter the collection. */
export function getArchivalImages(sites) {
  const seen = new Set();
  return (Array.isArray(sites) ? sites : []).flatMap((site) => {
    if (!record(site) || !isApprovedSite(site)) return [];
    return (Array.isArray(site.heritageMedia) ? site.heritageMedia : []).flatMap((resource) => {
      if (resource?.type !== 'archival-image' || resource.verified !== true || resource.siteId !== String(site.id)
        || mediaLicenseState(resource) !== 'verified' || !approvedCover({ id: site.id, coverImage: resource })) return [];
      const key = JSON.stringify([String(site.id), resource.id]);
      if (seen.has(key)) return [];
      seen.add(key); return [{ key, site, resource }];
    });
  });
}
