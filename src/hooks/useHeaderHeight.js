import { useEffect } from 'react';

/**
 * Keeps --hb-header-height in step with the sticky header, so a map-first page can fill exactly the rest
 * of the window (src/styles/map-first.css). Used by the home page and the Map page.
 */
export default function useHeaderHeight() {
  useEffect(() => {
    const header = document.querySelector('.hb-header');
    if (!header) return undefined;
    const apply = () => document.documentElement.style.setProperty('--hb-header-height', `${header.offsetHeight}px`);
    apply();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(header);
    return () => {
      observer?.disconnect();
      document.documentElement.style.removeProperty('--hb-header-height');
    };
  }, []);
}
