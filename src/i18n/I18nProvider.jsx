import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './I18nContext';
import { applyDocumentLanguage, detectLanguage, storeLanguage } from './detectLanguage';
import { isSupportedLanguage } from './languages';
import { setCurrentLanguage, t, tn } from './index';

/**
 * Language state for the whole app.
 *  - first visit: chosen from the visitor's region (Germany, Austria, Liechtenstein -> German, else English)
 *  - after the visitor picks a language, that choice is remembered and wins
 * Children are keyed by language, so a switch re-renders everything, including memoised labels.
 */
export default function I18nProvider({ children, initialLanguage }) {
  const [lang, setLangState] = useState(() => initialLanguage ?? detectLanguage());
  setCurrentLanguage(lang);

  const setLang = useCallback((code) => {
    if (!isSupportedLanguage(code)) return;
    storeLanguage(code);
    setLangState(code);
  }, []);

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, tn }), [lang, setLang]);
  return (
    <I18nContext.Provider value={value}>
      <LanguageScope key={lang}>{children}</LanguageScope>
    </I18nContext.Provider>
  );
}

function LanguageScope({ children }) {
  return children;
}
