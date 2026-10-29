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

/** Spelling variants -> canonical key above. */
const ALIASES = {
  ninawa: 'nineveh',
  ninevah: 'nineveh',
  dohuk: 'duhok',
  arbil: 'erbil',
  saladin: 'salahaldin',
  salahuddin: 'salahaldin',
  salahaddin: 'salahaldin',
  slemani: 'sulaymaniyah',
  sulaimaniyah: 'sulaymaniyah',
  sulaymaniya: 'sulaymaniyah',
};

export function getGovernorateKey(name) {
  const key = String(name ?? '')
    .toLowerCase()
    .replace(/\bgovernorate\b/g, '')
    .replace(/[^a-z]/g, '');
  return ALIASES[key] ?? key;
}

export function getGovernorateCode(name) {
  const key = getGovernorateKey(name);
  if (GOVERNORATE_CODES[key]) return GOVERNORATE_CODES[key];
  return key.slice(0, 2).toUpperCase() || 'XX';
}
