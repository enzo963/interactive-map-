import { useCallback, useMemo } from 'react';
import { useSearchParams } from '../router/RouterContext';
import { EMPTY_FILTERS, countActive, parseFilters, serializeFilters } from '../utils/filterSites';

/** Filter state that lives in the URL, so every search is shareable and Back works. */
export default function useSiteFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const setFilters = useCallback(
    (patch) =>
      setParams((current) => {
        const previous = parseFilters(current);
        const change = typeof patch === 'function' ? patch(previous) : patch;
        return serializeFilters({ ...previous, ...change }, current);
      }),
    [setParams],
  );

  const clear = useCallback(() => setParams((current) => serializeFilters(EMPTY_FILTERS, current)), [setParams]);

  return { filters, setFilters, clear, activeCount: countActive(filters) };
}
