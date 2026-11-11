import { getGovernorateKey } from '../data/governorates';
import { getGovernorateBack } from '../data/collections';

/** Sites -> one deck per governorate (largest first). Counts always come from the data. */
export function groupByGovernorate(sites) {
  const decks = new Map();
  for (const site of sites) {
    if (!site.governorate) continue;
    const id = getGovernorateKey(site.governorate);
    if (!decks.has(id)) decks.set(id, { id, name: site.governorate, sites: [] });
    decks.get(id).sites.push(site);
  }
  return [...decks.values()]
    .sort((a, b) => b.sites.length - a.sites.length || a.name.localeCompare(b.name))
    .map((deck) => ({
      ...deck,
      count: deck.sites.length,
      back: getGovernorateBack(deck.name),
      href: `/decks/${deck.id}`,
    }));
}

/** More cards -> a thicker pile (2–6 edges). */
export const deckThickness = (count) => Math.max(2, Math.min(6, Math.round(Math.log2(count + 1)) + 1));
