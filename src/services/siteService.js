import rawSites from '../data/sites.json';
import { normalizeSites } from '../utils/siteAdapter';
import { isVisibleCard } from '../utils/cardReadiness';
import { videosForSite } from '../utils/siteVideos';
import { documentationForSite } from '../utils/digitalDocumentation';

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
  if (!cache) {
    cache = normalizeSites(rawSites)
      .filter((_, index) => isVisibleCard(rawSites[index]))
      // Videos and 3D documentation are attached after the card contract is applied: they enrich a
      // published card and never decide whether it is published.
      .map((site) => {
        const videos = videosForSite(site.id);
        const documentation = documentationForSite(site.id);
        const enriched = videos.length ? { ...site, videos, hasVideo: true } : { ...site, videos };
        if (!documentation.length) return enriched;
        const seen = new Set(site.modelResources.map((resource) => resource.url));
        return {
          ...enriched,
          modelResources: [...site.modelResources, ...documentation.filter((resource) => !seen.has(resource.url))],
          hasModel: true,
          has3D: true,
        };
      });
  }
  return cache;
}

export function getSiteBySlug(slug) {
  return getAllSites().find((s) => s.slug === slug) ?? null;
}
