import rawSites from '../data/sites.json';
import { normalizeSites } from '../utils/siteAdapter';

/**
 * Data access layer. Today: local JSON, synchronous.
 * Later: swap the body for fetch()/API calls and make these async —
 * components only depend on the normalized shape.
 */
let cache = null;

export function getAllSites() {
  if (!cache) cache = normalizeSites(rawSites);
  return cache;
}

export function getSiteBySlug(slug) {
  return getAllSites().find((s) => s.slug === slug) ?? null;
}
