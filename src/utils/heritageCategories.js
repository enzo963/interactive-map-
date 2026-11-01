// Browsing groups derived from existing site types. A site can belong to several groups.
export const HERITAGE_CATEGORIES = [
  {
    id: 'archaeological',
    label: 'Archaeological',
    description: 'Ancient settlements, excavations and caves',
    pattern: /archaeolog|cave|settlement|ruins|neolithic/i,
  },
  {
    id: 'religious',
    label: 'Religious',
    description: 'Mosques, churches, shrines and sacred places',
    pattern: /mosque|minaret|church|temple|shrine|monastery|religious|cathedral|chapel|synagogue/i,
  },
  {
    id: 'architectural',
    label: 'Architectural',
    description: 'Buildings, bridges and monumental design',
    pattern: /palace|citadel|fort|bridge|school|building|tower|monument|complex|mosque|minaret|church/i,
  },
  {
    id: 'cultural',
    label: 'Cultural',
    description: 'Museums, markets and places of learning',
    pattern: /museum|market|bazaar|school|urban|historic city/i,
  },
  {
    id: 'historical',
    label: 'Historical',
    description: 'Historic towns, fortifications and landmarks',
    pattern: /historic|palace|citadel|fort|monument/i,
  },
];
export function getHeritageCategories(site) {
  const type = site.siteType ?? site.category ?? '';
  return HERITAGE_CATEGORIES.filter((category) => category.pattern.test(type)).map((category) => category.id);
}
