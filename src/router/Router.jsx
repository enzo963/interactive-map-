import { useCallback, useEffect, useMemo, useState } from 'react';
import { RouterContext, useRouter } from './RouterContext';
import { matchRoute } from './matchRoute';

const readLocation = () => ({
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash,
});

/**
 * Minimal History-API router (no dependency).
 * Production hosting must serve index.html for unknown paths (SPA fallback).
 */
export function RouterProvider({ children }) {
  const [state, setState] = useState(() => ({ location: readLocation(), type: 'init', scroll: false }));

  const navigate = useCallback((to, { replace = false, scroll = true } = {}) => {
    const url = new URL(to, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }
    window.history[replace ? 'replaceState' : 'pushState'](null, '', `${url.pathname}${url.search}${url.hash}`);
    setState({ location: readLocation(), type: replace ? 'replace' : 'push', scroll });
  }, []);

  useEffect(() => {
    const onPop = () => setState({ location: readLocation(), type: 'pop', scroll: false });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const value = useMemo(
    () => ({ location: state.location, navType: state.type, scroll: state.scroll, navigate }),
    [state, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

/** Renders the matching page. Pages receive `params`. Remounts when the path changes. */
export function Routes({ routes, notFound: NotFound }) {
  const { location, navType, scroll } = useRouter();
  const match = matchRoute(routes, location.pathname);
  const Page = match ? match.route.component : NotFound;

  useEffect(() => {
    if (navType === 'init' || navType === 'pop' || !scroll) return;
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true }); // keyboard + screen-reader users land on the new page
  }, [location.pathname, location.hash, navType, scroll]);

  return <Page key={location.pathname} params={match ? match.params : {}} />;
}
