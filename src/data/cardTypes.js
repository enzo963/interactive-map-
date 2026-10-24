/**
 * Card classification — the single source of truth.
 *
 * A card's TYPE comes from the approximate age of the site. It is NOT a deck.
 * The age bands below are provisional: change `minAge` here and nothing else
 * in the UI needs to know. Components only consume the resulting object.
 *
 * Bands are lower-bound only; a type runs until the next type begins.
 */
export const CARD_TYPES = [
  { id: 'I',   tier: 1, numeral: 'I',   minAge: 0 },
  { id: 'II',  tier: 2, numeral: 'II',  minAge: 200 },
  { id: 'III', tier: 3, numeral: 'III', minAge: 500 },
  { id: 'IV',  tier: 4, numeral: 'IV',  minAge: 1000 },
  { id: 'V',   tier: 5, numeral: 'V',   minAge: 2000, rankLabel: 'Legendary' },
].map((type, index, all) => {
  const next = all[index + 1];
  const maxAge = next ? next.minAge - 1 : null;
  return {
    ...type,
    maxAge,
    shortLabel: `Type ${type.numeral}`,
    rangeLabel: maxAge === null ? `${type.minAge}+ years` : `${type.minAge}–${maxAge} years`,
  };
});

/** Used when a site has no usable date. Honest fallback, never a guess. */
export const UNCLASSIFIED_TYPE = {
  id: 'unclassified',
  tier: 0,
  numeral: '—',
  minAge: null,
  maxAge: null,
  shortLabel: 'Unclassified',
  rangeLabel: 'Date not recorded',
};
