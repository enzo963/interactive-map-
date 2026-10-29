import en from './messages/en.js';
import ar from './messages/ar.js';
import de from './messages/de.js';
import { getLanguage } from './languages.js';

const CATALOGS = { en, ar, de };

const interpolate = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (match, name) => (vars && name in vars ? String(vars[name]) : match));

/**
 * t("some.key", { name }) -> string.
 * A message may be a plural object ({ one, other, ... }); the form is chosen from vars.n
 * with the language's own plural rules (Arabic has six forms).
 * Missing keys fall back to English, then to the key itself.
 */
export function createTranslator(code) {
  const { locale } = getLanguage(code);
  const catalog = CATALOGS[code] ?? en;
  const rules = new Intl.PluralRules(locale);

  return function t(key, vars) {
    let message = catalog[key] ?? en[key];
    if (message === undefined) return key;
    if (typeof message === 'object') {
      const form = rules.select(Number(vars?.n ?? 0));
      message = message[form] ?? message.other;
    }
    return interpolate(message, vars);
  };
}

export { CATALOGS };
