import registry from '../data/source-credibility.json';

/**
 * Source credibility for the card contract (see src/data/source-credibility.json).
 * Tiers 1–3 are credible; tier 4 (discovery) and locators never support a card.
 * A source on a mirror or general host may name the cited work's type with
 * `sourceType` (e.g. "academic-publication") and must then say why in `sourceTypeNote`.
 */
const TIER_BY_DOMAIN = new Map(
  Object.entries(registry.domains).flatMap(([tier, domains]) => domains.map((domain) => [domain, tier])),
);

const text = (value) => (typeof value === 'string' ? value.trim() : '');

export const sourceHost = (source) => {
  try {
    return new URL(text(source?.url)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** Registered tier for a host or its nearest registered parent domain, or null when unclassified. */
function domainTier(host) {
  for (let candidate = host; candidate.includes('.'); candidate = candidate.slice(candidate.indexOf('.') + 1)) {
    if (TIER_BY_DOMAIN.has(candidate)) return TIER_BY_DOMAIN.get(candidate);
  }
  return null;
}

/** '1' | '2' | '3' | '4' | 'locator' | null (unclassified). */
export function sourceTier(source) {
  const declared = registry.sourceTypeTiers[text(source?.sourceType)];
  if (declared && text(source?.sourceTypeNote)) return declared;
  // A coordinates lookup (e.g. "Wikidata Q123 (coordinates)") locates a site but does not document it.
  if (/\(coordinates\)\s*$/i.test(text(source?.sourceName))) return 'locator';
  return domainTier(sourceHost(source));
}

export const isCredibleSource = (source) =>
  Boolean(text(source?.sourceName)) && /^https?:\/\/\S+$/i.test(text(source?.url)) && registry.tiers[sourceTier(source)]?.credible === true;

/** Strongest credible tier among the sources as a number (1 is strongest), or null when none is credible. */
export function bestTier(sources) {
  const tiers = (Array.isArray(sources) ? sources : []).filter(isCredibleSource).map((source) => Number(sourceTier(source)));
  return tiers.length ? Math.min(...tiers) : null;
}

/** Distinct publishers among the credible sources, so two pages of one site count once. */
export const crediblePublishers = (sources) =>
  new Set((Array.isArray(sources) ? sources : []).filter(isCredibleSource).map(sourceHost));

export const TIERS = registry.tiers;
