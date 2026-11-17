import { getAllSites } from '../services/siteService.js';
import { getAllCollections, getDeckById } from '../utils/decks.js';
import { getHistoryGroups } from '../utils/history.js';
import { getCuratedCollection, CURATED_COLLECTIONS } from '../data/curatedCollections.js';
import { GOVERNORATE_NAMES } from '../data/governorates.js';
import { approvedSite, normalizePath, publishedDeck, resolveMetadata, ROUTE_ALIASES, STATIC_PAGES } from './metadata.js';

export function metadataForLocation(pathname, search, siteUrl, unavailable = false, sites = getAllSites(), base = '/') {
  const path = normalizePath(pathname);
  const parts = path.split('/');
  let id = '';
  try { id = decodeURIComponent(parts[2] ?? ''); } catch { /* malformed route remains invalid */ }
  return resolveMetadata({
    pathname: path, search, siteUrl, unavailable, base,
    site: parts[1] === 'sites' && parts.length === 3 ? sites.find((site) => site.slug === id) : null,
    deck: parts[1] === 'decks' && parts.length === 3 ? getDeckById(sites, id) : null,
    collection: parts[1] === 'collections' && parts.length === 3 ? getCuratedCollection(sites, id) : null,
    era: parts[1] === 'civilizations' && parts.length === 3 ? getHistoryGroups(sites).find((era) => era.id === id) : null,
  });
}

/** Use the same normalized services as the UI. Research candidates are never read. */
export function metadataPaths(sites = getAllSites(), { includeNonIndexable = false } = {}) {
  return [...new Set([
    ...Object.keys(STATIC_PAGES), ...Object.keys(ROUTE_ALIASES),
    ...getHistoryGroups(sites).map((era) => `/civilizations/${era.id}`),
    ...CURATED_COLLECTIONS.map(({ id }) => `/collections/${id}`),
    ...sites.filter((site) => includeNonIndexable || approvedSite(site)).map((site) => `/sites/${encodeURIComponent(site.slug)}`),
    ...getAllCollections(sites).filter((deck) => includeNonIndexable || publishedDeck(deck)).map((deck) => deck.href),
    ...(includeNonIndexable ? Object.keys(GOVERNORATE_NAMES).map((key) => `/decks/${key}`) : []),
  ])];
}
