const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function withBasePath(path) {
  if (!base || !path?.startsWith('/') || path.startsWith('//') || path.startsWith(base + '/')) return path;
  return base + path;
}

export function appPathname(pathname) {
  if (pathname === base) return '/';
  return pathname.startsWith(base + '/') ? pathname.slice(base.length) : pathname;
}
