import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { RouterContext, useRouter } from './RouterContext';
import { matchRoute } from './matchRoute';
import RouteBoundary from '../components/common/RouteBoundary';
import PageLoading from '../components/common/PageLoading';

const resultsPath = /^\/(?:explore|map|timeline|civilizations(?:\/[^/]+)?|(?:decks|collections)\/[^/]+|unesco|3d-archive|image-archive|disappeared-heritage)\/?$/;
const sitePath = /^\/sites\/[^/]+\/?$/;

function getResultsHref(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\s]/.test(value)) return null;
  return resultsPath.test(value.split(/[?#]/, 1)[0]) ? value : null;
}

const readLocation = () => ({
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash,
  resultsHref: getResultsHref(window.history.state?.resultsHref),
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
    const current = readLocation();
    const resultsHref = sitePath.test(url.pathname)
      ? getResultsHref(`${current.pathname}${current.search}${current.hash}`) || (sitePath.test(current.pathname) ? current.resultsHref : null)
      : null;
    window.history[replace ? 'replaceState' : 'pushState'](resultsHref ? { resultsHref } : null, '', `${url.pathname}${url.search}${url.hash}`);
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
  const { location } = useRouter();
  const match = matchRoute(routes, location.pathname);
  const Page = match ? match.route.component : NotFound;
  return (
    <RouteBoundary key={location.pathname}>
      <Suspense fallback={<PageLoading />}>
        <ResolvedRoute key={location.pathname} Page={Page} params={match ? match.params : {}} />
      </Suspense>
    </RouteBoundary>
  );
}

// Effects inside Suspense commit only when the real page and its sections exist.
function ResolvedRoute({ Page, params }) {
  const { location, navType, scroll } = useRouter();

  useEffect(() => {
    if (navType === 'init' && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
      return;
    }
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

  return <Page params={params} />;
}
