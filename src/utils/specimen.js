/**
 * A clearly-labelled sample card, used ONLY when the dataset has no real site
 * of a given type. It has no link, no image, no place and no historical claim.
 */
export function makeSpecimen(cardType) {
  return {
    id: `specimen-${cardType.id}`,
    isSpecimen: true,
    translations: {},
    dateYear: null,
    slug: null,
    href: null,
    name: 'Specimen',
    governorate: '',
    country: '',
    siteType: 'Sample card',
    period: '',
    dateLabel: cardType.rangeLabel,
    cardType,
    archiveNo: 'HB-XX-0000',
    image: null,
    imageAlt: '',
    isUnesco: false,
    hasModel: false,
  };
}
