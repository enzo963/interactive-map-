import { getModelEmbed } from './media';
import { attributionFields, mediaLicenseState } from './mediaAttribution';
import { safeUrl } from './urls';
import { getSearchNames, normalizeSearchText } from './search';

export const isApprovedSite = (site) =>
  String(site.status ?? site.verification_status ?? site.verificationStatus ?? '').toLowerCase() ===
  'approved';

const MODEL_TYPES = new Set(['3d', '3d-model', 'model', 'reconstruction', 'digital-reconstruction']);
const clean = (value) => typeof value === 'string' ? value.trim() : '';
const statuses = (asset) => [asset.verificationStatus, asset.verification_status].filter((value) => value != null && value !== '');
const accepted = (value) => ['approved', 'verified'].includes(value);
const boundTo = (asset, siteId) => [asset.siteId, asset.site_id].every((id) => id == null || id === '' || String(id) === String(siteId));
const validMetadata = (asset, siteId) => boundTo(asset, siteId) && asset.verified !== false && statuses(asset).every(accepted);
const canonicalUrl = (url) => {
  const embed = getModelEmbed(url);
  if (!embed) return '';
  const parsed = new URL(embed.src, 'https://history-in-cards.invalid');
  parsed.hash = '';
  return embed.src.startsWith('/') ? `${parsed.pathname}${parsed.search}` : parsed.href;
};

/**
 * Preserve the legacy publication contract: approved site + has3D/has_3d + primary
 * URL, or an approved/verified digital asset, is model verification evidence.
 * Optional metadata enriches that evidence; it cannot grant approval. Legacy
 * assets without an explicit site binding inherit their containing site's ID.
 * License verification remains independently bound to the resource URL.
 */
export function normalizeModelResources(raw) {
  if (!isApprovedSite(raw)) return [];
  const primary = raw.model_3d_url ?? raw.model_url ?? '';
  const candidates = [];
  if ((raw.has3D === true || raw.has_3d === true) && primary) {
    const metadata = raw.model_metadata && typeof raw.model_metadata === 'object' && !Array.isArray(raw.model_metadata) ? raw.model_metadata : {};
    if (validMetadata(metadata, raw.id)) candidates.push({ title: '3D model', ...metadata, url: primary });
  }
  for (const asset of Array.isArray(raw.digital_assets) ? raw.digital_assets : []) {
    if (!asset || !MODEL_TYPES.has(String(asset.type).toLowerCase())) continue;
    if (!statuses(asset).length || !validMetadata(asset, raw.id)) continue;
    candidates.push(asset);
  }
  const seen = new Set();
  return candidates.flatMap((asset) => {
    if (mediaLicenseState(asset) === 'restricted') return [];
    const embed = getModelEmbed(asset.url);
    const key = canonicalUrl(asset.url);
    if (!embed || seen.has(key)) return [];
    seen.add(key);
    const bytes = asset.fileSizeBytes ?? asset.file_size_bytes;
    const year = asset.year ?? asset.creation_year;
    return [
      {
        ...Object.fromEntries(['creation_method', 'file_size_bytes', 'verification_status', 'site_id', 'creation_year'].filter((field) => Object.hasOwn(asset, field)).map((field) => [field, asset[field]])),
        ...attributionFields(asset),
        id: clean(asset.id),
        url: asset.url,
        title: clean(asset.title) || '3D resource',
        siteId: String(raw.id),
        creator: clean(asset.creator),
        creationMethod: clean(asset.creationMethod ?? asset.creation_method),
        year: Number.isInteger(year) && year >= 1 && year <= 9999 ? year : null,
        sourceName: clean(asset.sourceName ?? asset.source_name),
        sourceUrl: safeUrl(asset.sourceUrl ?? asset.source_url) || '',
        format: clean(asset.format).toUpperCase() || embed.format || '',
        fileSizeBytes: Number.isSafeInteger(bytes) && bytes >= 0 ? bytes : null,
        verificationStatus: statuses(asset)[0] || 'verified',
        verified: true,
        credit: clean(asset.credit),
        license: clean(asset.license),
        kind: embed.type,
      },
    ];
  });
}

export const hasVerifiedModel = (site) =>
  isApprovedSite(site) &&
  (site.modelResources ?? []).some(
    (r) => eligibleResource(r, site),
  );

const eligibleResource = (resource, site) => resource?.verified === true
  && resource.siteId != null && resource.siteId !== '' && String(resource.siteId) === String(site.id)
  && validMetadata(resource, site.id) && mediaLicenseState(resource) !== 'restricted' && Boolean(getModelEmbed(resource.url));

/** Consume normalized site resources, retaining one entry per site and canonical URL. */
export function getModelLibrary(sites) {
  const seen = new Set();
  return sites.flatMap((site) => {
    if (!isApprovedSite(site)) return [];
    return (site.modelResources ?? []).flatMap((resource) => {
      if (!eligibleResource(resource, site)) return [];
      const key = JSON.stringify([String(site.id), canonicalUrl(resource.url)]);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ key, site, resource }];
    });
  });
}

/** All words match across canonical model metadata and the site's searchable names. */
export function searchModelLibrary(entries, query = '') {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  return entries.filter(({ site, resource }) => {
    const text = normalizeSearchText([...getSearchNames(site), site.governorate,
      resource.title, resource.creator, resource.creationMethod, resource.year,
      resource.sourceName, resource.sourceUrl, resource.license, resource.format,
      resource.verificationStatus].filter((value) => value != null).join(' '));
    return words.every((word) => text.includes(word));
  });
}
