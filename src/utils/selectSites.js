/** Ranking helpers for editorial selections. Pure functions over normalized sites. */

const score = (s) =>
  (s.isFeatured ? 100 : 0) + (s.image ? 20 : 0) + s.cardType.tier * 2 + (s.hasModel ? 1 : 0) + (s.isUnesco ? 1 : 0);

const byScore = (a, b) => score(b) - score(a);

/** One card per type where possible (highest first), returned oldest-on-top for stacking. */
export function selectStackSites(sites, count = 5) {
  const ranked = [...sites].sort(byScore);
  const picked = [];
  const usedTiers = new Set();

  for (const site of ranked) {
    if (picked.length >= count) break;
    if (!usedTiers.has(site.cardType.tier)) {
      picked.push(site);
      usedTiers.add(site.cardType.tier);
    }
  }
  for (const site of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(site)) picked.push(site);
  }
  return picked.sort((a, b) => a.cardType.tier - b.cardType.tier);
}

/** Featured picks, avoiding cards already shown in the hero when the dataset allows. */
export function selectFeaturedSites(sites, count = 3, excludeIds = []) {
  const exclude = new Set(excludeIds);
  const fresh = sites.filter((s) => !exclude.has(s.id));
  const pool = fresh.length >= count ? fresh : sites;
  return [...pool].sort(byScore).slice(0, count);
}
