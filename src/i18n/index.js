import de from './messages/de.js';
import { DEFAULT_LANGUAGE, getLanguage, isSupportedLanguage } from './languages.js';

/**
 * gettext-style translation: the English text IS the key.
 *   t('Explore Cards')                      -> 'Karten entdecken' in German, unchanged in English
 *   t('Showing {shown} of {total}', { ... }) -> placeholders are filled in after translating
 *   tn('{n} Card', '{n} Cards', n)          -> plural form chosen with the language's own rules
 * A text with no German entry is shown in English, so new strings never break the page.
 * `npm run check:i18n` lists strings that still need a German translation.
 */
const CATALOGS = { de };

let current = DEFAULT_LANGUAGE;
let rules = new Intl.PluralRules(getLanguage(current).locale);

/** Set by I18nProvider before the app renders; components re-render (remount) on change. */
export function setCurrentLanguage(code) {
  current = isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
  rules = new Intl.PluralRules(getLanguage(current).locale);
}

export const currentLanguage = () => current;
export const currentLocale = () => getLanguage(current).locale;

const interpolate = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text;

export function t(text, vars) {
  if (typeof text !== 'string' || text === '') return text;
  return interpolate(CATALOGS[current]?.[text] ?? text, vars);
}

export function tn(one, other, n, vars) {
  const english = Number(n) === 1 ? one : other;
  const catalog = CATALOGS[current];
  let text = english;
  if (catalog) {
    const form = rules.select(Number(n));
    const key = `${one}|${other}`;
    text = catalog[key]?.[form] ?? catalog[key]?.other ?? catalog[english] ?? english;
  }
  return interpolate(text, { n, ...vars });
}

/** Card date labels written by utils/siteYears.js ("c. 100 BCE") in the interface language; authored text is kept. */
export function tDate(label) {
  if (!label || current === DEFAULT_LANGUAGE) return label;
  const match = /^c\. (\d+) (BCE|CE)$/.exec(label);
  if (!match) return t(label);
  return t(match[2] === 'BCE' ? 'c. {n} BCE' : 'c. {n} CE', { n: match[1] });
}

/** Number formatting in the interface language (1,234 / 1.234). */
export const formatNumber = (n) => new Intl.NumberFormat(currentLocale()).format(n);

export { CATALOGS };
