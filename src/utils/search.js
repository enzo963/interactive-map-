/** Unicode folding is shared by search and exact-value filters. */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function getSearchNames(site) {
  return [
    site.name,
    ...['alternativeNames', 'alternative_names', 'altNames', 'aliases'].flatMap((key) =>
      Array.isArray(site[key]) ? site[key] : [],
    ),
  ].filter((name) => typeof name === 'string' && name.trim());
}

function fieldRelevance(text, query, words) {
  if (!text) return 0;
  const occurrences = words.reduce((total, word) => total + text.split(word).length - 1, 0);
  const density = occurrences / Math.max(1, text.split(/[^\p{L}\p{N}]+/u).length);
  return words.filter((word) => text.includes(word)).length + density +
    (text === query ? 6 : text.includes(query) ? 3 : 0);
}

/** Lower ranks are stronger. Infinity means at least one query word is absent. */
export function searchSiteRank(site, query = '', { includeMetadata = false } = {}) {
  const q = normalizeSearchText(query);
  if (!q) return 0;
  const words = q.split(' ');
  const names = getSearchNames(site).map(normalizeSearchText);
  const primary = normalizeSearchText(site.name);
  const metadataFields = includeMetadata ? [
    [site.governorate, 4], [site.siteType || site.category, 4], [site.period, 4],
    [site.civilization, 4], [site.city, 3], [site.archiveNo, 3], [site.dateLabel, 1],
  ].map(([value, weight]) => [normalizeSearchText(value), weight]) : [];
  const metadata = metadataFields.map(([text]) => text).join(' ');
  const description = includeMetadata ? normalizeSearchText([site.description, site.shortDescription].filter(Boolean).join(' ')) : '';
  if (!words.every((word) => [...names, metadata, description].some((text) => text.includes(word)))) return Infinity;
  if (primary === q) return 0;
  if (names.some((name) => name === q)) return 1;
  if (names.some((name) => name.startsWith(q))) return 2;
  if (words.every((word) => names.some((name) => name.split(/[^\p{L}\p{N}]+/u).some((part) => part.startsWith(word))))) return 3;
  if (words.every((word) => names.some((name) => name.includes(word)))) return 4;
  const metadataScore = metadataFields.reduce((score, [text, weight]) => score + weight * fieldRelevance(text, q, words), 0) +
    names.reduce((score, text) => score + 6 * fieldRelevance(text, q, words), 0);
  // Fractions refine a tier without ever crossing a stronger name/metadata tier.
  if (words.every((word) => [...names, metadata].some((text) => text.includes(word)))) return 5 + 1 / (1 + metadataScore);
  return 6 + 1 / (1 + metadataScore + fieldRelevance(description, q, words));
}

/** All words must match; equal relevance preserves the original local order. */
export function searchSites(sites, query = '', options = {}) {
  if (!normalizeSearchText(query)) return [...sites];
  return sites.map((site) => ({ site, rank: searchSiteRank(site, query, options) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank)
    .map(({ site }) => site);
}
