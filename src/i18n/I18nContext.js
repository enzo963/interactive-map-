import { createContext, useContext } from 'react';

export const I18nContext = createContext(null);

/** { lang, dir, setLang, t, ls, ld, ... } — see I18nProvider. */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>.');
  return context;
}
