const clean = (path) => path.split('/').filter(Boolean);

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Matches "/decks/:deckId" style patterns. Returns { route, params } or null. */
export function matchRoute(routes, pathname) {
  const parts = clean(pathname);
  for (const route of routes) {
    const pattern = clean(route.path);
    if (pattern.length !== parts.length) continue;
    const params = {};
    const ok = pattern.every((segment, i) => {
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = safeDecode(parts[i]);
        return true;
      }
      return segment === parts[i];
    });
    if (ok) return { route, params };
  }
  return null;
}
