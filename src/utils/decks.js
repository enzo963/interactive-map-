import { SPECIAL_COLLECTIONS, VIEW_FILTERS, isCollectionMember } from '../data/collections';
import { getGovernorateKey } from '../data/governorates';
import { getThematicDefinitions } from '../services/deckService';
import { groupByGovernorate } from './groupDecks';

/**
 * Collections API. Every deck returned has:
 *   id, kind ('special' | 'thematic' | 'governorate'), title, shortTitle?, blurb, back, sites, count, href
 * Definitions come from data/collections.js (special), data/decks.json (thematic) and the sites
 * themselves (governorate). Nothing is declared twice.
 */
const withSites = (def, kind, sites) => {
  const members = sites.filter((site) => isCollectionMember(site, def));
  return { ...def, kind, sites: members, count: members.length, href: `/decks/${def.id}` };
};

export const getSpecialDecks = (sites) => SPECIAL_COLLECTIONS.map((def) => withSites(def, 'special', sites));

export const getThematicDecks = (sites) => getThematicDefinitions().map((def) => withSites(def, 'thematic', sites));

export function getGovernorateDecks(sites) {
  return groupByGovernorate(sites).map((deck) => ({
    ...deck,
    kind: 'governorate',
    title: `${deck.name} Deck`,
    blurb: `Heritage cards recorded in ${deck.name}.`,
  }));
}

/** All decks, deduplicated by id (special, then thematic, then governorate). */
export function getAllCollections(sites) {
  const seen = new Set();
  const out = [];
  for (const deck of [...getSpecialDecks(sites), ...getThematicDecks(sites), ...getGovernorateDecks(sites)]) {
    if (!seen.has(deck.id)) {
      seen.add(deck.id);
      out.push(deck);
    }
  }
  return out;
}

export const getDeckById = (sites, id) => getAllCollections(sites).find((deck) => deck.id === id) ?? null;

/** The decks one site belongs to (a card has ONE type but can sit in many decks). */
export function getDecksForSite(site) {
  const decks = [];
  if (site.governorate) {
    const id = getGovernorateKey(site.governorate);
    decks.push({ id, title: `${site.governorate} Deck`, href: `/decks/${id}` });
  }
  for (const def of SPECIAL_COLLECTIONS) {
    if (isCollectionMember(site, def)) decks.push({ id: def.id, title: def.title, href: `/decks/${def.id}` });
  }
  for (const def of getThematicDefinitions()) {
    if (site.deckIds.includes(def.id)) decks.push({ id: def.id, title: def.title, href: `/decks/${def.id}` });
  }
  return decks;
}

/** Pools for "Draw a Card": every non-empty collection plus the non-deck views. */
export function getDrawPools(sites) {
  return [
    { id: 'all', label: 'All Cards', back: 'plain', cards: sites },
    ...getSpecialDecks(sites).map((d) => ({ id: d.id, label: d.shortTitle ?? d.title, back: d.back, cards: d.sites })),
    ...getThematicDecks(sites).filter((d) => d.count > 0).map((d) => ({ id: d.id, label: d.title, back: d.back, cards: d.sites })),
    ...VIEW_FILTERS.map((v) => ({ id: v.id, label: v.label, back: v.back, cards: sites.filter(v.rule) })),
  ];
}
