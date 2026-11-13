import { isApprovedSite } from './modelResources';

const historyKey = 'hic-discovery-history';
let historyFallback = [];
let useFallback = false;

function readHistory() {
  if (useFallback) return historyFallback;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(historyKey) || '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter((id) => typeof id === 'string'))] : [];
  } catch {
    return historyFallback;
  }
}

/** Prefer new sites across all pools. Once a pool is exhausted, rotate oldest draws first. */
export function pickDiscovery(sites, random = Math.random) {
  const eligible = new Map(sites.filter(isApprovedSite).map((site) => [site.id, site]));
  if (eligible.size === 0) return null;
  const history = readHistory();
  const seen = new Set(history);
  const fresh = [...eligible.values()].filter((site) => !seen.has(site.id));
  if (fresh.length) return fresh[Math.floor(random() * fresh.length)];
  return eligible.get(history.find((id) => eligible.has(id)));
}

/** Record the site when it is revealed or opened. */
export function rememberDiscovery(site) {
  historyFallback = [...readHistory().filter((id) => id !== site.id), site.id];
  try {
    window.sessionStorage.setItem(historyKey, JSON.stringify(historyFallback));
  } catch {
    useFallback = true;
  }
}
