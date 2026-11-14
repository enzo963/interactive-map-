import { getSearchNames, normalizeSearchText } from './search';

/** Pass the visible local archive; this helper performs no data access. */
export function getSearchSuggestions(sites, query, { limit = 8 } = {}) {
  const q = normalizeSearchText(query);
  if ([...q].length < 2) return [];
  const cap = Math.min(8, Math.max(0, Math.floor(Number(limit) || 0)));
  const candidates = [];
  for (const site of sites) {
    const names = getSearchNames(site);
    candidates.push(...names.map((value) => ({ value, type: value === site.name ? 'name' : 'alias' })),
      ...[['governorate', site.governorate], ['civilization', site.civilization], ['category', site.siteType || site.category]]
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(([type, value]) => ({ type, value })));
  }
  const seen = new Set();
  return candidates.filter(({ value }) => {
    const folded = normalizeSearchText(value);
    if (seen.has(folded) || !q.split(' ').every((word) => folded.includes(word))) return false;
    seen.add(folded);
    return true;
  }).sort((a, b) => {
    const rank = ({ value }) => {
      const folded = normalizeSearchText(value);
      return folded === q ? 0 : folded.startsWith(q) ? 1 : 2;
    };
    return rank(a) - rank(b);
  }).slice(0, cap);
}
