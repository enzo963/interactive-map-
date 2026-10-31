/** Normalize search text without changing the underlying record. */
export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Search normalized sites by name only. All whitespace-separated words must
 * match, in any order. Case and diacritics are ignored. Blank queries return
 * a new array in the original order; input arrays and records are never changed.
 */
export function searchSites(sites, query = '') {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  return sites.filter((site) => words.every((word) => normalizeSearchText(site.name).includes(word)));
}
