import { isApprovedSite } from './modelResources';

// These are broad browsing groups, not assigned dates or a chronology of each site.
export const HISTORY_ERAS = [
  { id: 'neolithic', label: 'Neolithic', terms: ['Neolithic'] },
  { id: 'assyrian', label: 'Assyrian', terms: ['Assyrian'] },
  { id: 'babylonian', label: 'Babylonian', terms: ['Babylonian'] },
  { id: 'hellenistic', label: 'Hellenistic', terms: ['Hellenistic'] },
  { id: 'parthian', label: 'Parthian', terms: ['Parthian'] },
  { id: 'sasanian', label: 'Sasanian', terms: ['Sasanian'] },
  { id: 'islamic', label: 'Islamic', terms: ['Islamic', 'Abbasid'] },
  { id: 'medieval', label: 'Medieval', terms: ['Medieval'] },
  { id: 'ottoman', label: 'Ottoman', terms: ['Ottoman'] },
  { id: 'nineteenth-century', label: '19th century', terms: ['19th century'] },
  { id: 'british', label: 'British period', terms: ['British'] },
  { id: 'modern', label: 'Modern', terms: ['Modern'] },
];

const normalize = (value) => value.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ');
const recordedLabels = (site) => [site.period, site.civilization]
  .filter((value) => typeof value === 'string' && value.trim());
const eraPatterns = HISTORY_ERAS.map(({ terms }) => terms.map((term) =>
  new RegExp(`(?:^|[^\\p{L}\\p{N}\\p{M}_])${normalize(term)}(?=$|[^\\p{L}\\p{N}\\p{M}_])`, 'u'),
));
const matchesEra = (site, index) => recordedLabels(site)
  .some((label) => eraPatterns[index].some((pattern) => pattern.test(normalize(label))));

/** Visual association only: it never changes record verification or visibility. */
export function getSiteHistoryEras(site) {
  return HISTORY_ERAS.filter((_, index) => matchesEra(site, index));
}

/** Keep approved records in their source order, with one card per site ID. */
export function getHistorySites(sites) {
  const seen = new Set();
  return sites.filter((site) => {
    if (!isApprovedSite(site) || seen.has(site.id)) return false;
    seen.add(site.id);
    return true;
  });
}

export function getHistoryGroups(sites) {
  const approved = getHistorySites(sites);
  return HISTORY_ERAS.map((era, index) => ({ ...era, sites: approved.filter((site) => matchesEra(site, index)) }));
}

export function getUnplacedHistorySites(sites) {
  return getHistorySites(sites).filter((site) => !HISTORY_ERAS.some((_, index) => matchesEra(site, index)));
}

/** Return complete recorded labels, preserving the first spelling of each label. */
export function getRecordedPeriods(sites) {
  const labels = new Map();
  for (const site of getHistorySites(sites)) {
    for (const label of recordedLabels(site)) {
      const key = normalize(label);
      if (!labels.has(key)) labels.set(key, label);
    }
  }
  return [...labels.values()].sort((a, b) => a.localeCompare(b));
}

export function matchesRecordedPeriod(site, period) {
  if (typeof period !== 'string' || !normalize(period)) return false;
  return recordedLabels(site).some((label) => normalize(label) === normalize(period));
}
