import { withBasePath } from './basePath';

/** Saved slugs make renamed records keep their existing route. */
export const getSitePath = (site) => `/sites/${encodeURIComponent(site.slug)}`;

export function getSiteShareUrl(site, origin = typeof window === 'undefined' ? '' : window.location.origin) {
  const path = withBasePath(getSitePath(site));
  return origin ? new URL(path, origin).href : path;
}
