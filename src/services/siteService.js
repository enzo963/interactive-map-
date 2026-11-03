import rawSites from '../data/sites.json';
import { normalizeSites } from '../utils/siteAdapter';
import { isVisibleCard } from '../utils/cardReadiness';

/**
 * Data access layer. Today: local JSON, synchronous.
 * Later: swap the body for fetch()/API calls and make these async —
 * components only depend on the normalized shape.
 */
let cache = null;

/**
 * Visible cards only: records that meet the minimum card contract and have a
 * published status (src/utils/cardReadiness.js). Normalizing every record first
 * keeps provisional archive numbers stable when a record is hidden.
 */
export function getAllSites() {
  if (!cache) cache = normalizeSites(rawSites).filter((_, index) => isVisibleCard(rawSites[index]));
  return cache;
}

export function getSiteBySlug(slug) {
  return getAllSites().find((s) => s.slug === slug) ?? null;
}
