import thematicDecks from '../data/decks.json';
import { CARD_BACK_VARIANTS, RESERVED_DECK_IDS } from '../data/collections';
import slugify from '../utils/slugify';

/**
 * Data access for thematic deck DEFINITIONS (metadata only).
 * Membership is never stored here: a site joins a thematic deck by listing the deck id
 * in its own `decks` array in sites.json.
 *
 * decks.json entry: { "id": "ancient-cities", "title": "Ancient Cities",
 *                     "description": "...", "back": "geometric" }
 * `back` is optional and defaults to "plain".
 */
let cache = null;

export function getThematicDefinitions() {
  if (cache) return cache;
  const list = Array.isArray(thematicDecks) ? thematicDecks : thematicDecks?.decks ?? [];
  const seen = new Set();
  cache = [];

  for (const def of list) {
    const title = String(def?.title ?? '').trim();
    const id = slugify(def?.id ?? def?.slug ?? title);
    if (!id || !title) continue;
    if (RESERVED_DECK_IDS.includes(id) || seen.has(id)) {
      if (import.meta.env.DEV) console.warn(`decks.json: "${id}" is reserved or duplicated and was ignored.`);
      continue;
    }
    seen.add(id);
    cache.push({
      id,
      title,
      blurb: String(def.description ?? def.blurb ?? '').trim(),
      back: CARD_BACK_VARIANTS.includes(def.back) ? def.back : 'plain',
    });
  }
  return cache;
}
