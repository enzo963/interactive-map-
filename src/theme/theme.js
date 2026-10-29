const STORAGE_KEY = 'hb-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const isTheme = (value) => value === 'light' || value === 'dark';

export function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* the choice then lasts for this visit only */
  }
}

/** A saved choice wins; otherwise follow the device setting. */
export function detectTheme() {
  return readStoredTheme() ?? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light');
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export { DARK_QUERY };
