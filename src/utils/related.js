import { getGovernorateKey } from '../data/governorates';

/** Related cards by shared decks, place, civilization, period, site type and card type. */
export function getRelatedSites(site, sites, count = 4) {
  const governorate = getGovernorateKey(site.governorate);
  const score = (other) => {
    let n = other.deckIds.filter((id) => site.deckIds.includes(id)).length * 2;
    if (governorate && getGovernorateKey(other.governorate) === governorate) n += 2;
    if (site.civilization && other.civilization === site.civilization) n += 2;
    if (site.period && other.period === site.period) n += 1;
    if (site.siteType && other.siteType === site.siteType) n += 1;
    if (site.cardType.tier > 0 && other.cardType.tier === site.cardType.tier) n += 1;
    return n;
  };
  return sites
    .filter((other) => other.id !== site.id)
    .map((other) => ({ other, n: score(other) }))
    .filter((entry) => entry.n > 0)
    .sort((a, b) => b.n - a.n || a.other.name.localeCompare(b.other.name))
    .slice(0, count)
    .map((entry) => entry.other);
}
