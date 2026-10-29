import { getGovernorateKey } from './governorates';

/**
 * COLLECTION DEFINITIONS — single source of truth.
 *
 * There are three kinds of deck (collection):
 *   governorate  generated automatically from each site's governorate (nothing to define here
 *                except an optional card-back pattern below)
 *   special      system decks whose membership is a rule over normalized site data (below)
 *   thematic     defined in src/data/decks.json; membership comes from `deckIds` on site records
 *
 * A site has exactly ONE age-based card type (see cardTypes.js) but can be in many decks.
 *
 * Normalized collection shape (built in utils/decks.js):
 *   { id, kind, title, shortTitle?, blurb, back, sites, count, href }
 */

/** Valid card-back patterns (see components/cards/CardBack.jsx). */
export const CARD_BACK_VARIANTS = ['plain', 'geometric', 'arches', 'citadel', 'formal', 'fragment', 'survey', 'wireframe'];

/**
 * Card-back pattern per governorate deck. Decorative only, never presented as an
 * authentic historical motif. Governorates not listed use 'plain' until a back is designed.
 * 'arches' is reserved for a future Mosul / Old Mosul deck.
 */
export const GOVERNORATE_BACKS = {
  nineveh: 'geometric',
  erbil: 'citadel',
};

export const getGovernorateBack = (governorateName) =>
  GOVERNORATE_BACKS[getGovernorateKey(governorateName)] ?? 'plain';

/**
 * System ("special") decks. `rule` is evaluated on normalized sites. A site also belongs to a
 * special deck if its `deckIds` explicitly include the deck id.
 * `flag: true` also exposes the deck as a "must have" filter on Explore and the Map.
 */
export const SPECIAL_COLLECTIONS = [
  { id: 'unesco', title: 'UNESCO Heritage', shortTitle: 'UNESCO', blurb: 'Sites recorded with a UNESCO designation.', back: 'formal', flag: true, rule: (site) => site.isUnesco },
  { id: 'lost', title: 'Lost Heritage', blurb: 'Sites recorded as lost or destroyed.', back: 'fragment', flag: true, rule: (site) => site.isLost },
  { id: 'our-work', title: 'Our Documentation', blurb: 'Sites documented first-hand by the project.', back: 'survey', flag: true, rule: (site) => site.hasOurWork },
  { id: '3d', title: '3D Archive', blurb: 'Sites with a 3D model in the archive.', back: 'wireframe', flag: true, rule: (site) => site.hasModel },
];

/**
 * Views that are NOT decks (they never get a page). "Draw a Card" offers them as extra pools.
 * Ancient Sites is a view over card types, not a collection.
 */
export const VIEW_FILTERS = [
  { id: 'ancient', label: 'Ancient Sites', back: 'plain', rule: (site) => site.cardType.tier >= 4 },
];

/** Ids that thematic decks may not use. */
export const RESERVED_DECK_IDS = ['all', ...SPECIAL_COLLECTIONS.map((c) => c.id), ...VIEW_FILTERS.map((v) => v.id)];

/** True when the site belongs to the collection by rule OR by an explicit `deckIds` entry. */
export const isCollectionMember = (site, collection) =>
  Boolean(collection.rule?.(site)) || site.deckIds.includes(collection.id);
