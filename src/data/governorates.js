/**
 * Archive-number prefixes (HB-<code>-0001).
 * PROVISIONAL: these two-letter codes are identifiers chosen for the prototype,
 * not an official standard. Confirm them before records are published.
 */
export const GOVERNORATE_CODES = {
  nineveh: 'NI',
  duhok: 'DU',
  erbil: 'ER',
  kirkuk: 'KI',
  salahaldin: 'SD',
  sulaymaniyah: 'SU',
  baghdad: 'BG',
  anbar: 'AN',
  babylon: 'BB',
  basra: 'BS',
  dhiqar: 'DQ',
  diyala: 'DI',
  karbala: 'KA',
  maysan: 'MA',
  muthanna: 'MU',
  najaf: 'NA',
  qadisiyyah: 'QA',
  wasit: 'WA',
};

/**
 * Display names for the governorate selector on the Map. Governorates that appear in the
 * data but not here are added automatically. Edit this list if the administrative divisions change.
 */
export const GOVERNORATE_NAMES = {
  anbar: 'Anbar',
  babylon: 'Babylon',
  baghdad: 'Baghdad',
  basra: 'Basra',
  dhiqar: 'Dhi Qar',
  diyala: 'Diyala',
  duhok: 'Duhok',
  erbil: 'Erbil',
  karbala: 'Karbala',
  kirkuk: 'Kirkuk',
  maysan: 'Maysan',
  muthanna: 'Muthanna',
  najaf: 'Najaf',
  nineveh: 'Nineveh',
  qadisiyyah: 'Qadisiyyah',
  salahaldin: 'Salah al-Din',
  sulaymaniyah: 'Sulaymaniyah',
  wasit: 'Wasit',
};

/**
 * Alternative names of each governorate -> canonical key above. They are matched after folding
 * (accents, case, spaces, hyphens, apostrophes and the words "governorate"/"province"/"محافظة"
 * removed), so "Ninawa Governorate", "Nīnawā" and "محافظة نينوى" are all Nineveh.
 * Records store the canonical name (GOVERNORATE_NAMES); variants stay here, never in the data.
 */
const ALTERNATIVE_NAMES = {
  nineveh: ['Ninewa', 'Ninawa', 'Ninevah', 'Ninive', 'Nineve', 'Ninua', 'Nainawa', 'نينوى', 'نەینەوا'],
  duhok: ['Dohuk', 'Dahuk', 'Dihok', 'Duhoq', 'دهوك', 'دهۆک'],
  erbil: ['Arbil', 'Irbil', 'Hawler', 'Hewler', 'Hawlir', 'أربيل', 'اربيل', 'هولير', 'هەولێر'],
  sulaymaniyah: ['Sulaimaniyah', 'Sulaymaniya', 'Sulaimaniya', 'Suleimaniyah', 'Sulaimani', 'Slemani', 'Silemani', 'Slimani', 'Sulaymaniyyah', 'السليمانية', 'سليمانية', 'سلێمانی'],
  kirkuk: ['Kerkuk', 'Karkuk', 'Kirkouk', 'Tamim', 'At-Tamim', "Al-Ta'mim", 'كركوك', 'التأميم', 'کەرکووک'],
  salahaldin: ['Saladin', 'Salahuddin', 'Salahaddin', 'Salah ad-Din', 'Salah ad Din', 'Salahadin', 'Salaheddine', 'Salah el-Din', 'صلاح الدين'],
  diyala: ['Diala', 'Dyala', 'ديالى', 'دیالە'],
  baghdad: ['Bagdad', 'Baghdād', 'بغداد'],
  anbar: ['Al-Anbar', 'Al Anbar', 'الأنبار', 'انبار'],
  babylon: ['Babil', 'Babel', 'بابل'],
  basra: ['Basrah', 'Al-Basrah', 'البصرة'],
  dhiqar: ['Thi Qar', 'Dhi-Qar', 'ذي قار'],
  karbala: ['Kerbala', 'Karbalaa', 'كربلاء'],
  maysan: ['Missan', 'Maisan', 'ميسان'],
  muthanna: ['Al-Muthanna', 'المثنى'],
  najaf: ['An-Najaf', 'Al-Najaf', 'النجف'],
  qadisiyyah: ['Qadisiyah', 'Al-Qadisiyyah', 'Diwaniyah', 'القادسية'],
  wasit: ['Wassit', 'واسط'],
};

/** Case, accents, punctuation, Arabic letter forms and the word "governorate" removed. */
function foldGovernorate(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\b(governorate|province|muhafazat|muhafazah)\b/g, '')
    .replace(/محافظة/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\p{L}]/gu, '');
}

const ALIASES = new Map(
  Object.entries(ALTERNATIVE_NAMES).flatMap(([key, names]) => [key, GOVERNORATE_NAMES[key], ...names].map((name) => [foldGovernorate(name), key])),
);

/** Canonical key for any spelling of a governorate; an unrecognised name keeps its own folded key. */
export function getGovernorateKey(name) {
  const key = foldGovernorate(name);
  return ALIASES.get(key) ?? key;
}

/** The canonical name stored in records ("Ninewa" → "Nineveh"), or null when the name is not a governorate. */
export function normalizeGovernorate(name) {
  return GOVERNORATE_NAMES[getGovernorateKey(name)] ?? null;
}

/** Recorded alternative names of a governorate (for search and data entry), by canonical key. */
export const governorateAlternativeNames = (key) => ALTERNATIVE_NAMES[key] ?? [];

export function getGovernorateCode(name) {
  const key = getGovernorateKey(name);
  if (GOVERNORATE_CODES[key]) return GOVERNORATE_CODES[key];
  return key.slice(0, 2).toUpperCase() || 'XX';
}
