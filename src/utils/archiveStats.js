import { CARD_TYPES } from '../data/cardTypes';
import { getGovernorateKey } from '../data/governorates';

/** Headline numbers, always derived from the dataset. */
export function getArchiveStats(sites) {
  const governorates = new Set(sites.map((s) => getGovernorateKey(s.governorate)).filter(Boolean));
  return {
    cards: sites.length,
    types: CARD_TYPES.length,
    governorates: governorates.size,
    models: sites.filter((s) => s.hasModel).length,
  };
}

export const formatCount = (n) => String(n).padStart(2, '0');

export const cardsLabel = (n) => `${n} ${n === 1 ? 'Card' : 'Cards'}`;
