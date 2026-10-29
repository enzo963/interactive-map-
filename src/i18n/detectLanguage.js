import { DEFAULT_LANGUAGE, getLanguage, isSupportedLanguage } from './languages.js';

const STORAGE_KEY = 'hb-lang';

/** Region -> interface language. Every other region gets English. */
const REGION_LANGUAGE = { IQ: 'ar', DE: 'de' };

/**
 * Browsers expose the time zone, not the country, so the common zones of the
 * regions above are listed here. This needs no network request and no permission.
 */
const TIMEZONE_REGION = {
  'Asia/Baghdad': 'IQ',
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',
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

/** Best guess of the visitor's country: time zone first, then the region of the browser locale (e.g. "de-DE"). */
export function detectRegion() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_REGION[zone]) return TIMEZONE_REGION[zone];
  } catch {
    /* ignore */
  }
  try {
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of tags) {
      const region = new Intl.Locale(tag).region;
      if (region) return region.toUpperCase();
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** A language the visitor chose beats the region; with neither, English. */
export function detectLanguage() {
  return readStoredLanguage() ?? REGION_LANGUAGE[detectRegion()] ?? DEFAULT_LANGUAGE;
}

/** Keeps <html lang dir> in step with the language (screen readers, fonts, RTL layout). */
export function applyDocumentLanguage(code) {
  const { dir } = getLanguage(code);
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
}
