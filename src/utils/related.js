import { getGovernorateKey } from '../data/governorates';
import { normalizeSearchText } from './search';
import { getHeritageCategories } from './heritageCategories';
import { isApprovedSite } from './modelResources';

const PLACEHOLDERS = new Set(['unknown', 'not recorded', 'n/a', 'multiple periods', 'multi-period']);
const meaningful = (value) => value && !PLACEHOLDERS.has(value);
const contextTerms = (value) => {
  const text = normalizeSearchText(value).replace(/\bn\/a\b/g, 'not recorded');
  return new Set(text.split(/\s+(?:and|including)\s+|[,;/]/).map((term) => term.trim()).filter(meaningful));
};
const intersects = (a, b) => [...a].some((value) => b.has(value));

const toRadians = (degrees) => degrees * Math.PI / 180;
const validCoordinates = ({ latitude, longitude }) =>
  Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
  Number.isFinite(longitude) && Math.abs(longitude) <= 180;

function distanceKm(a, b) {
  if (!validCoordinates(a) || !validCoordinates(b)) return Infinity;
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);
  const haversine = Math.sin((latitudeB - latitudeA) / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

const DISTANCE_BANDS = [
  { limit: 10, score: 6, reason: 'Within 10 km' },
  { limit: 25, score: 4, reason: 'Within 25 km' },
  { limit: 50, score: 2, reason: 'Within 50 km' },
];

// Catalog records use this annotation to identify a monument's containing site by ID.
const parentSiteId = (site) => {
  const id = String(site.heritageStatus ?? '').trim().match(/^Monument within (site-[a-z0-9]+(?:-[a-z0-9]+)*);/)?.[1];
  return id !== site.id ? id : undefined;
};

const compareText = (a, b) => (a < b ? -1 : Number(a > b));

/** Deterministic recommendations require a place, type or historical connection. */
export function getRelatedSiteMatches(site, sites, count = 4) {
  const seenIds = new Set([site.id]);
  const seenHrefs = new Set(site.href ? [site.href] : []);
  const governorate = getGovernorateKey(site.governorate);
  const siteType = normalizeSearchText(site.siteType);
  const ownCivilizations = contextTerms(site.civilization);
  const ownPeriods = contextTerms(site.recordedPeriod ?? site.period);
  const ownThemes = new Set(getHeritageCategories(site));
  const parentId = isApprovedSite(site) ? parentSiteId(site) : undefined;
  const matches = [];
  for (const other of sites) {
    if (seenIds.has(other.id) || seenHrefs.has(other.href) || !isApprovedSite(other)) continue;
    let score = 0;
    const reasons = [];
    const otherParentId = parentSiteId(other);
    const directLink = (parentId && parentId === other.id) || (otherParentId && otherParentId === site.id);
    if (directLink || (parentId && parentId === otherParentId)) {
      score += directLink ? 30 : 28;
      reasons.push('Part of the same heritage site');
    }
    if (governorate && governorate === getGovernorateKey(other.governorate)) {
      score += 4;
      reasons.push('Same governorate');
    }
    if (siteType && siteType === normalizeSearchText(other.siteType)) {
      score += 5;
      reasons.push('Same site category');
    } else if (intersects(ownThemes, new Set(getHeritageCategories(other)))) {
      score += 2;
      reasons.push('Shared heritage category');
    }
    if (intersects(ownCivilizations, contextTerms(other.civilization))) {
      score += 5;
      reasons.push('Shared civilization');
    }
    if (intersects(ownPeriods, contextTerms(other.recordedPeriod ?? other.period))) {
      score += 4;
      reasons.push('Shared recorded period');
    }
    const distance = distanceKm(site, other);
    const band = DISTANCE_BANDS.find(({ limit }) => distance <= limit);
    if (band) {
      score += band.score;
      reasons.push(band.reason);
    }
    if (!score) continue;
    if (site.isUnesco && other.isUnesco) {
      score += 1;
      reasons.push('Both World Heritage properties');
    }
    matches.push({ site: other, score, reasons });
  }
  return matches
    .sort(
      (a, b) =>
        b.score - a.score || compareText(normalizeSearchText(a.site.name), normalizeSearchText(b.site.name)) ||
        compareText(a.site.id, b.site.id),
    )
    .filter(({ site: candidate }) => {
      if (seenIds.has(candidate.id) || seenHrefs.has(candidate.href)) return false;
      seenIds.add(candidate.id);
      if (candidate.href) seenHrefs.add(candidate.href);
      return true;
    })
    .slice(0, Math.max(0, count));
}

export const getRelatedSites = (site, sites, count = 4) =>
  getRelatedSiteMatches(site, sites, count).map((match) => match.site);
