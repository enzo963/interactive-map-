import { getGovernorateKey } from '../data/governorates';
import { normalizeSearchText } from './search';
import { getHeritageCategories } from './heritageCategories';
import { isApprovedSite } from './modelResources';

// Ignore placeholder chronology when comparing historical context.
const meaningful = (value) =>
  value && !['unknown', 'not recorded', 'n/a', 'multiple periods', 'multi-period'].includes(value);
const periods = (site) =>
  new Set(
    [site.period, site.civilization]
      .flatMap((value) => normalizeSearchText(value).split(/\s+and\s+|\s+including\s+|[,;/]/))
      .map((value) => value.trim())
      .filter(meaningful),
  );
const intersects = (a, b) => [...a].some((value) => b.has(value));

/** Deterministic recommendations require a place, type or historical connection. */
export function getRelatedSiteMatches(site, sites, count = 4) {
  const seen = new Set([site.id]);
  const ownPeriods = periods(site),
    ownThemes = new Set(getHeritageCategories(site));
  const matches = [];
  for (const other of sites) {
    if (seen.has(other.id) || (site.href && other.href === site.href) || !isApprovedSite(other)) continue;
    seen.add(other.id);
    let score = 0;
    const reasons = [];
    if (site.governorate && getGovernorateKey(site.governorate) === getGovernorateKey(other.governorate)) {
      score += 4;
      reasons.push('Same governorate');
    }
    if (site.siteType && normalizeSearchText(site.siteType) === normalizeSearchText(other.siteType)) {
      score += 5;
      reasons.push('Same site category');
    } else if (intersects(ownThemes, new Set(getHeritageCategories(other)))) {
      score += 2;
      reasons.push('Shared heritage category');
    }
    if (intersects(ownPeriods, periods(other))) {
      score += 4;
      reasons.push('Shared period or civilization');
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
        b.score - a.score || a.site.name.localeCompare(b.site.name) || a.site.id.localeCompare(b.site.id),
    )
    .slice(0, Math.max(0, count));
}

export const getRelatedSites = (site, sites, count = 4) =>
  getRelatedSiteMatches(site, sites, count).map((match) => match.site);
