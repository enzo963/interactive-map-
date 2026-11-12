/**
 * Controlled site types (the `category` field and the "Site type" filter). Records store exactly one
 * of CATEGORIES. Spellings and variants that mean the same type are kept in CATEGORY_ALIASES and
 * resolved by normalizeCategory(), never stored in the data. `npm run check:values` reports records
 * whose value is a variant or unknown; `-- --write` stores the canonical value.
 */
export const CATEGORIES = [
  'Archaeological Site', 'Archaeological City', 'Archaeological Cave', 'Cave', 'Rock Relief', 'Stele',
  'Mosque', 'Church', 'Monastery', 'Shrine', 'Mausoleum', 'Temple', 'Synagogue', 'Minaret', 'Cemetery',
  'Palace', 'Castle', 'Citadel', 'Gate', 'Historic Bridge', 'Historic Building', 'Historic House',
  'Historic Monument', 'Historic School', 'Historic Bath', 'Historic Market', 'Caravanserai', 'Museum',
  'Historic Town', 'Historic Urban Area',
];

/** Variant → canonical type. Includes the content pipeline's slugs, so imports land on the same filters. */
export const CATEGORY_ALIASES = {
  'Mosque and Minaret': 'Mosque',
  'Historic City': 'Historic Town',
  'Old Town': 'Historic Town',
  'Archaeological Settlement': 'Archaeological Site',
  'Archaeological Tell': 'Archaeological Site',
  Tell: 'Archaeological Site',
  'Memorial Museum': 'Museum',
  Fortress: 'Castle',
  Fort: 'Castle',
  Bridge: 'Historic Bridge',
  Market: 'Historic Market',
  Bazaar: 'Historic Market',
  Souq: 'Historic Market',
  Khan: 'Caravanserai',
  Hammam: 'Historic Bath',
  Bath: 'Historic Bath',
  School: 'Historic School',
  Madrasa: 'Historic School',
  Tomb: 'Mausoleum',
  Cathedral: 'Church',
  Monument: 'Historic Monument',
  'Historic District': 'Historic Urban Area',
  'Ancient City': 'Archaeological City',
  // Content-pipeline taxonomy (tools/content-pipeline).
  'archaeological-site': 'Archaeological Site',
  'archaeological-tell': 'Archaeological Site',
  'ancient-city': 'Archaeological City',
  'castle-fortress': 'Castle',
  'gate-wall': 'Gate',
  'cave-rock-shelter': 'Archaeological Cave',
  'historic-building': 'Historic Building',
  'historic-district': 'Historic Urban Area',
};

/** Case, spacing, hyphens, accents and a plural "s" do not distinguish types ("mosques" = "Mosque"). */
const foldCategory = (value) => String(value ?? '')
  .normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^a-z]+/g, ' ').trim()
  .split(' ').map((word) => (word.length > 3 ? word.replace(/(ch|sh|ss|x)es$/, '$1').replace(/([^s])s$/, '$1') : word)).join(' ');

const CANONICAL = new Map([
  ...Object.entries(CATEGORY_ALIASES).map(([variant, canonical]) => [foldCategory(variant), canonical]),
  ...CATEGORIES.map((category) => [foldCategory(category), category]),
]);

/** The canonical type for any recorded spelling, or null when it is not a known type. */
export function normalizeCategory(value) {
  return CANONICAL.get(foldCategory(value)) ?? null;
}
