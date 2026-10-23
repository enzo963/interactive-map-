import { CARD_TYPES, UNCLASSIFIED_TYPE } from '../data/cardTypes';
import { getSiteAgeYears } from './siteYears';

/** Age in years -> card type object. */
export function getCardType(ageYears) {
  if (!Number.isFinite(ageYears) || ageYears < 0) return UNCLASSIFIED_TYPE;
  let match = UNCLASSIFIED_TYPE;
  for (const type of CARD_TYPES) {
    if (ageYears >= type.minAge) match = type;
  }
  return match;
}

/** Raw site record -> card type object. */
export function getCardTypeForSite(rawSite) {
  return getCardType(getSiteAgeYears(rawSite));
}

export default getCardType;
