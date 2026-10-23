import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const read = () => {
  if (typeof window === 'undefined') return false;
  const setting = document.documentElement.dataset.motion;
  return window.matchMedia(QUERY).matches || setting === 'reduced' || setting === 'off';
};

/**
 * True when the visitor wants less motion. Also honours a future in-site
 * setting: <html data-motion="reduced|off">.
 */
export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(read);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setReduced(read());
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}
