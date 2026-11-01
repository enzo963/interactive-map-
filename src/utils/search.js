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

/** All query words must match. Aliases are searchable; inputs remain unchanged. */
export function searchSites(sites, query = '', { includeMetadata = false } = {}) {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  return sites.filter((site) => {
    const values = getSearchNames(site);
    if (includeMetadata)
      values.push(
        site.city,
        site.governorate,
        site.siteType,
        site.period,
        site.civilization,
        site.archiveNo,
        site.dateLabel,
      );
    const text = normalizeSearchText(values.filter(Boolean).join(' '));
    return words.every((word) => text.includes(word));
  });
}
