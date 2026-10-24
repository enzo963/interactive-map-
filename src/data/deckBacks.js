import { getGovernorateKey } from './governorates';

/**
 * Card-back pattern per governorate deck. Decorative geometry only —
 * never presented as an authentic historical motif.
 *
 * Only Nineveh and Erbil have a dedicated pattern so far (per the design brief).
 * Every other deck falls back to 'plain' until its own back is designed.
 * 'arches' is reserved for a future Mosul / Old Mosul deck.
 */
const GOVERNORATE_BACKS = {
  nineveh: 'geometric',
  erbil: 'citadel',
};

export const getDeckBack = (governorateName) =>
  GOVERNORATE_BACKS[getGovernorateKey(governorateName)] ?? 'plain';
