import { getModelEmbed } from './media';

export const isApprovedSite = (site) =>
  String(site.status ?? site.verification_status ?? site.verificationStatus ?? '').toLowerCase() ===
  'approved';

const MODEL_TYPES = new Set(['3d', '3d-model', 'model', 'reconstruction', 'digital-reconstruction']);

/** A URL or collection tag alone is not verification of a model. */
export function normalizeModelResources(raw) {
  if (!isApprovedSite(raw)) return [];
  const primary = raw.model_3d_url ?? raw.model_url ?? '';
  const candidates = [];
  if ((raw.has3D === true || raw.has_3d === true) && primary) {
    candidates.push({ url: primary, title: '3D model' });
  }
  for (const asset of Array.isArray(raw.digital_assets) ? raw.digital_assets : []) {
    if (!asset || !MODEL_TYPES.has(String(asset.type).toLowerCase())) continue;
    if (!['approved', 'verified'].includes(asset.verification_status)) continue;
    if (asset.siteId && asset.siteId !== raw.id) continue;
    candidates.push(asset);
  }
  const seen = new Set();
  return candidates.flatMap((asset) => {
    const embed = getModelEmbed(asset.url);
    if (!embed || seen.has(embed.src)) return [];
    seen.add(embed.src);
    return [
      {
        url: asset.url,
        title: asset.title || 'Digital reconstruction',
        siteId: String(raw.id),
        verified: true,
        credit: asset.credit || '',
        license: asset.license || '',
        kind: embed.type,
      },
    ];
  });
}

export const hasVerifiedModel = (site) =>
  isApprovedSite(site) &&
  (site.modelResources ?? []).some(
    (r) => r.verified === true && r.siteId === site.id && getModelEmbed(r.url),
  );
