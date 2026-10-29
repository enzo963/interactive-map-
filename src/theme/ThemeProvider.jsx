import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext';
import { DARK_QUERY, applyTheme, detectTheme, isTheme, readStoredTheme, storeTheme } from './theme';

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(detectTheme);

  const setTheme = useCallback((next) => {
    if (!isTheme(next)) return;
    storeTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Until the visitor chooses, follow the device if it switches (e.g. at sunset).
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (!readStoredTheme()) setThemeState(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
