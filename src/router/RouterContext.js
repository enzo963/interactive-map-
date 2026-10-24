import { createContext, useCallback, useContext, useMemo } from 'react';

export const RouterContext = createContext(null);

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error('Router hooks must be used inside <RouterProvider>.');
  return context;
}

export const useLocation = () => useRouter().location;
export const useNavigate = () => useRouter().navigate;

/**
 * [params, setParams]. `setParams` takes an object, URLSearchParams, or a function
 * receiving the CURRENT params (read from the address bar, so it is never stale).
 * Replaces the history entry by default so typing in a search box does not
 * flood the back button.
 */
export function useSearchParams() {
  const { location, navigate } = useRouter();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setParams = useCallback(
    (next, { replace = true } = {}) => {
      const current = new URLSearchParams(window.location.search);
      const value = typeof next === 'function' ? next(current) : next;
      const resolved = value instanceof URLSearchParams ? value : new URLSearchParams(value);
      const query = resolved.toString();
      navigate(`${window.location.pathname}${query ? `?${query}` : ''}`, { replace, scroll: false });
    },
    [navigate],
  );

  return [params, setParams];
}
