import { SPECIAL_COLLECTIONS, VIEW_FILTERS, isCollectionMember } from '../data/collections';
import { getGovernorateKey, GOVERNORATE_NAMES } from '../data/governorates';
import { getThematicDefinitions } from '../services/deckService';
import { groupByGovernorate } from './groupDecks';
import { t } from '../i18n';
import { isApprovedSite } from './modelResources';

const collectionHref = (id) => ({ unesco: '/unesco', '3d': '/3d-archive', lost: '/disappeared-heritage' })[id] || `/decks/${id}`;

/**
 * Collections API. Every deck returned has:
 *   id, kind ('special' | 'thematic' | 'governorate'), title, shortTitle?, blurb, back, sites, count, href
 * Definitions come from data/collections.js (special), data/decks.json (thematic) and the sites
 * themselves (governorate). Nothing is declared twice.
 */
const withSites = (def, kind, sites) => {
  const members = sites.filter((site) => isCollectionMember(site, def));
  return { ...def, kind, sites: members, count: members.length, href: collectionHref(def.id) };
};

export const getSpecialDecks = (sites) => SPECIAL_COLLECTIONS.map((def) => withSites(def, 'special', sites));

export const getThematicDecks = (sites) => getThematicDefinitions().map((def) => withSites(def, 'thematic', sites));

export function getGovernorateDecks(sites) {
  return groupByGovernorate(sites).map((deck) => ({
    ...deck,
    kind: 'governorate',
    title: t('{name} Deck', { name: t(deck.name) }),
    blurb: t('Heritage cards recorded in {name}.', { name: t(deck.name) }),
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

export function getDeckById(sites, id) {
  const key = getGovernorateKey(id);
  const found = getAllCollections(sites).find((deck) => deck.id === id || (deck.kind === 'governorate' && deck.id === key));
  if (found) return found;
  const name = GOVERNORATE_NAMES[key];
  if (!name) return null;
  return { id: key, name, kind: 'governorate', title: t('{name} Deck', { name: t(name) }), blurb: t('Heritage cards recorded in {name}.', { name: t(name) }), back: 'plain', sites: [], count: 0, href: `/decks/${key}` };
}

/** The decks one site belongs to (a card has ONE type but can sit in many decks). */
export function getDecksForSite(site) {
  const decks = [];
  if (site.governorate) {
    const id = getGovernorateKey(site.governorate);
    decks.push({ id, title: t('{name} Deck', { name: t(site.governorate) }), href: `/decks/${id}` });
  }
  for (const def of SPECIAL_COLLECTIONS) {
    if (isCollectionMember(site, def)) decks.push({ id: def.id, title: def.title, href: collectionHref(def.id) });
  }
  for (const def of getThematicDefinitions()) {
    if (site.deckIds.includes(def.id)) decks.push({ id: def.id, title: def.title, href: collectionHref(def.id) });
  }
  return decks;
}

/** Pools for "Draw a Card": every non-empty collection plus the non-deck views. */
export function getDrawPools(sites) {
  const approved = sites.filter(isApprovedSite);
  return [
    { id: 'all', label: 'All Cards', back: 'plain', cards: approved },
    ...getSpecialDecks(approved).map((d) => ({ id: d.id, label: d.shortTitle ?? d.title, back: d.back, cards: d.sites })),
    ...getThematicDecks(approved).filter((d) => d.count > 0).map((d) => ({ id: d.id, label: d.title, back: d.back, cards: d.sites })),
    ...VIEW_FILTERS.map((v) => ({ id: v.id, label: v.label, back: v.back, cards: approved.filter(v.rule) })),
  ];
}
