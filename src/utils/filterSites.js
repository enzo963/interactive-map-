import { CARD_TYPES } from '../data/cardTypes';
import { DRAW_FILTERS } from '../data/drawFilters';
import { getGovernorateKey } from '../data/governorates';
import slugify from './slugify';

/**
 * One filter system for Explore and the Map. Everything is derived from the
 * normalized sites, so new data needs no code changes.
 *
 * State shape: { q, governorates[], types[], kinds[], flags[], sort }
 * URL:         ?q=hatra&gov=nineveh,erbil&type=4,5&kind=ancient-city&has=unesco,3d&sort=name
 * Within a group the choice is OR (Type IV or V); across groups it is AND.
 * "Must have" flags are AND (UNESCO and 3D).
 */
export const FLAG_FILTERS = [
  ...['unesco', 'lost', '3d', 'our-work']
    .map((id) => DRAW_FILTERS.find((f) => f.id === id))
    .filter(Boolean)
    .map(({ id, label, test }) => ({ id, label, test })),
  { id: 'video', label: 'Has video', test: (s) => s.hasVideo },
];

export const SORTS = [
  { id: 'archive', label: 'Archive number' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'newest', label: 'Newest first' },
  { id: 'type', label: 'Card type' },
];

export const EMPTY_FILTERS = { q: '', governorates: [], types: [], kinds: [], flags: [], sort: '' };

const KEYS = { q: 'q', governorates: 'gov', types: 'type', kinds: 'kind', flags: 'has', sort: 'sort' };
const list = (value) => (value ? value.split(',').filter(Boolean) : []);

export function parseFilters(params) {
  return {
    q: params.get(KEYS.q) ?? '',
    governorates: list(params.get(KEYS.governorates)),
    types: list(params.get(KEYS.types)),
    kinds: list(params.get(KEYS.kinds)),
    flags: list(params.get(KEYS.flags)),
    sort: params.get(KEYS.sort) ?? '',
  };
}

/** Writes filters into a copy of `base`, leaving unrelated params (e.g. ?site=) alone. */
export function serializeFilters(filters, base = new URLSearchParams()) {
  const out = new URLSearchParams(base);
  Object.values(KEYS).forEach((key) => out.delete(key));
  const set = (key, value) => {
    const text = Array.isArray(value) ? value.join(',') : value;
    if (text) out.set(key, text);
  };
  if (filters.q.trim()) set(KEYS.q, filters.q);
  set(KEYS.governorates, filters.governorates);
  set(KEYS.types, filters.types);
  set(KEYS.kinds, filters.kinds);
  set(KEYS.flags, filters.flags);
  set(KEYS.sort, filters.sort);
  return out;
}

export const countActive = (f) =>
  (f.q.trim() ? 1 : 0) + f.governorates.length + f.types.length + f.kinds.length + f.flags.length;

/* ---------- matching ---------- */

const fold = (text) =>
  String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const haystacks = new WeakMap();
function haystack(site) {
  let text = haystacks.get(site);
  if (!text) {
    text = fold(
      [site.name, site.city, site.governorate, site.siteType, site.period, site.civilization, site.archiveNo, site.dateLabel]
        .filter(Boolean)
        .join(' '),
    );
    haystacks.set(site, text);
  }
  return text;
}

const MATCHERS = {
  q: (s, f) => {
    const tokens = fold(f.q).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const text = haystack(s);
    return tokens.every((token) => text.includes(token));
  },
  governorates: (s, f) => f.governorates.length === 0 || f.governorates.includes(getGovernorateKey(s.governorate)),
  types: (s, f) => f.types.length === 0 || f.types.includes(String(s.cardType.tier)),
  kinds: (s, f) => f.kinds.length === 0 || f.kinds.includes(slugify(s.siteType)),
  flags: (s, f) => f.flags.every((id) => FLAG_FILTERS.find((flag) => flag.id === id)?.test(s) ?? true),
};

/** `omit` skips one group (used to count what each facet WOULD add). */
export function applyFilters(sites, filters, omit) {
  return sites.filter((site) => Object.entries(MATCHERS).every(([key, test]) => key === omit || test(site, filters)));
}

export function sortSites(sites, filters) {
  const mode = filters.sort || (filters.q.trim() ? 'relevance' : 'archive');
  const byName = (a, b) => a.name.localeCompare(b.name);
  const out = [...sites];

  switch (mode) {
    case 'name':
      out.sort(byName);
      break;
    case 'oldest':
      out.sort((a, b) => (b.ageYears ?? -1) - (a.ageYears ?? -1) || byName(a, b));
      break;
    case 'newest':
      out.sort((a, b) => (a.ageYears ?? Infinity) - (b.ageYears ?? Infinity) || byName(a, b));
      break;
    case 'type':
      out.sort((a, b) => b.cardType.tier - a.cardType.tier || byName(a, b));
      break;
    case 'relevance': {
      const q = fold(filters.q).trim();
      const rank = (s) => {
        const name = fold(s.name);
        if (name === q) return 0;
        if (name.startsWith(q)) return 1;
        return name.includes(q) ? 2 : 3;
      };
      out.sort((a, b) => rank(a) - rank(b) || byName(a, b));
      break;
    }
    default:
      out.sort((a, b) => a.archiveNo.localeCompare(b.archiveNo, undefined, { numeric: true }));
  }
  return out;
}

/* ---------- facets ---------- */

function tally(sites, keyOf) {
  const counts = new Map();
  for (const site of sites) {
    const key = keyOf(site);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Options for every filter group, with live counts given the OTHER active filters. */
export function getFacets(sites, filters) {
  const govCounts = tally(applyFilters(sites, filters, 'governorates'), (s) => getGovernorateKey(s.governorate));
  const typeCounts = tally(applyFilters(sites, filters, 'types'), (s) => String(s.cardType.tier));
  const kindCounts = tally(applyFilters(sites, filters, 'kinds'), (s) => slugify(s.siteType));

  const names = new Map();
  const kindLabels = new Map();
  for (const s of sites) {
    if (s.governorate && !names.has(getGovernorateKey(s.governorate))) names.set(getGovernorateKey(s.governorate), s.governorate);
    if (s.siteType && !kindLabels.has(slugify(s.siteType))) kindLabels.set(slugify(s.siteType), s.siteType);
  }
  const byLabel = (a, b) => a.label.localeCompare(b.label);

  const types = CARD_TYPES.map((t) => ({
    id: String(t.tier),
    label: t.shortLabel + (t.rankLabel ? ` · ${t.rankLabel}` : ''),
    hint: t.rangeLabel,
    count: typeCounts.get(String(t.tier)) ?? 0,
  }));
  if (sites.some((s) => s.cardType.tier === 0)) {
    types.push({ id: '0', label: 'Unclassified', hint: 'Date not recorded', count: typeCounts.get('0') ?? 0 });
  }

  const flagBase = applyFilters(sites, filters, 'flags');
  return {
    governorates: [...names].map(([id, label]) => ({ id, label, count: govCounts.get(id) ?? 0 })).sort(byLabel),
    types,
    kinds: [...kindLabels].map(([id, label]) => ({ id, label, count: kindCounts.get(id) ?? 0 })).sort(byLabel),
    flags: FLAG_FILTERS.map((f) => ({ id: f.id, label: f.label, count: flagBase.filter(f.test).length })),
  };
}
