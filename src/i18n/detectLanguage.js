import { DEFAULT_LANGUAGE, getLanguage, isSupportedLanguage } from './languages.js';

const STORAGE_KEY = 'hb-lang';

/** Region -> interface language. Every other region gets English. */
const REGION_LANGUAGE = { DE: 'de', AT: 'de', LI: 'de' };
/** Multilingual regions: German only when the browser itself prefers German. */
const GERMAN_IF_PREFERRED = new Set(['CH', 'LU', 'BE']);

/**
 * Browsers expose the time zone, not the country, so the zones of the regions above are listed here.
 * This needs no network request and no permission.
 */
const TIMEZONE_REGION = {
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',
  'Europe/Vienna': 'AT',
  'Europe/Vaduz': 'LI',
  'Europe/Zurich': 'CH',
  'Europe/Luxembourg': 'LU',
  'Europe/Brussels': 'BE',
};

export function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    return null; // storage can be blocked (private mode, strict settings)
  }
}

export function storeLanguage(code) {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* the choice then lasts for this visit only */
  }
}

const browserTags = () => {
  try {
    return navigator.languages?.length ? navigator.languages : [navigator.language].filter(Boolean);
  } catch {
    return [];
  }
};

/** Best guess of the visitor's country: time zone first, then the region of the browser locale (e.g. "de-AT"). */
export function detectRegion() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_REGION[zone]) return TIMEZONE_REGION[zone];
  } catch {
    /* ignore */
  }
  for (const tag of browserTags()) {
    try {
      const region = new Intl.Locale(tag).region;
      if (region) return region.toUpperCase();
    } catch {
      /* ignore malformed tags */
    }
  }
  return null;
}

/** A language the visitor chose beats the region; with neither, English. */
export function detectLanguage() {
  const stored = readStoredLanguage();
  if (stored) return stored;
  const region = detectRegion();
  if (REGION_LANGUAGE[region]) return REGION_LANGUAGE[region];
  if (GERMAN_IF_PREFERRED.has(region) && /^de\b/i.test(browserTags()[0] ?? '')) return 'de';
  return DEFAULT_LANGUAGE;
}

/** Keeps <html lang dir> in step with the language (screen readers, hyphenation, fonts). */
export function applyDocumentLanguage(code) {
  const { locale, dir } = getLanguage(code);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}
