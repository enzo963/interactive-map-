import { IRAQ_GOVERNORATE_GEOMETRY } from '../data/geo/iraqGovernorates';
import { getGovernorateKey } from '../data/governorates';

/**
 * Returns validated boundary geometry, or null.
 * Geometry WITHOUT a named source and licence is refused on purpose: the map must never
 * display boundaries whose origin is unknown.
 */
export function getGovernorateGeometry() {
  const geometry = IRAQ_GOVERNORATE_GEOMETRY;
  if (!geometry || typeof geometry.viewBox !== 'string' || !Array.isArray(geometry.features)) return null;
  if (!geometry.attribution?.name || !geometry.attribution?.license) return null;

  const features = geometry.features
    .filter((f) => f && typeof f.d === 'string' && f.d.length > 0)
    .map((f) => ({ key: f.key ?? getGovernorateKey(f.name), name: f.name ?? f.key, d: f.d }))
    .filter((f) => f.key);

  return features.length > 0 ? { viewBox: geometry.viewBox, attribution: geometry.attribution, features } : null;
}
