import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './I18nContext';
import { applyDocumentLanguage, detectLanguage, storeLanguage } from './detectLanguage';
import { getLanguage, isSupportedLanguage } from './languages';
import { createLocalizer } from './localize';
import { createTranslator } from './translator';

/**
 * Language state for the whole app.
 *  - first visit: chosen from the visitor's region (Iraq -> Arabic, Germany -> German, else English)
 *  - after the visitor picks a language, that choice is remembered and wins
 */
export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((code) => {
    if (!isSupportedLanguage(code)) return;
    storeLanguage(code);
    setLangState(code);
  }, []);

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  const value = useMemo(() => {
    const { dir, locale } = getLanguage(lang);
    const t = createTranslator(lang);
    const local = createLocalizer(lang, t, locale);
    return {
      lang,
      dir,
      locale,
      setLang,
      t,
      ls: local.site,
      ld: local.deck,
      localize: local,
      cardsLabel: local.cardsLabel,
      pageTitle: (title) => `${title} — ${t('brand.name')}`,
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
