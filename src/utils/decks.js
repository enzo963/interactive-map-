import { DRAW_FILTERS } from '../data/drawFilters';
import { SPECIAL_DECKS } from '../data/specialDecks';
import { getGovernorateKey } from '../data/governorates';
import { groupByGovernorate } from './groupDecks';

/** Every deck has: id, kind, title, blurb, back, sites, count, href. */
export function getSpecialDecks(sites) {
  return SPECIAL_DECKS.map((def) => {
    const filter = DRAW_FILTERS.find((f) => f.id === def.filterId);
    const cards = filter ? sites.filter(filter.test) : [];
    return { ...def, kind: 'special', sites: cards, count: cards.length, href: `/decks/${def.id}` };
  });
}

export function getGovernorateDecks(sites) {
  return groupByGovernorate(sites).map((deck) => ({
    ...deck,
    kind: 'governorate',
    title: `${deck.name} Deck`,
    blurb: `Heritage cards recorded in ${deck.name}.`,
  }));
}

export function getDeckById(sites, id) {
  return [...getSpecialDecks(sites), ...getGovernorateDecks(sites)].find((deck) => deck.id === id) ?? null;
}

/** The decks one site belongs to (a card has ONE type but can sit in many decks). */
export function getDecksForSite(site) {
  const decks = [];
  if (site.governorate) {
    decks.push({ id: getGovernorateKey(site.governorate), kind: 'governorate', name: site.governorate, title: `${site.governorate} Deck`, href: `/decks/${getGovernorateKey(site.governorate)}` });
  }
  for (const def of SPECIAL_DECKS) {
    const filter = DRAW_FILTERS.find((f) => f.id === def.filterId);
    if (filter?.test(site)) decks.push({ id: def.id, kind: 'special', title: def.title, href: `/decks/${def.id}` });
  }
  return decks;
}
