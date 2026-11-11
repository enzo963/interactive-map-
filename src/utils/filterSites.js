import { CARD_TYPES } from '../data/cardTypes';
import { SPECIAL_COLLECTIONS, isCollectionMember } from '../data/collections';
import { getGovernorateKey } from '../data/governorates';
import { filterSites } from './filters';
import { normalizeSearchText, searchSites, getSearchNames } from './search';
import { HERITAGE_CATEGORIES, getHeritageCategories } from './heritageCategories';
import slugify from './slugify';
import { t as tr } from '../i18n';

export const FLAG_FILTERS = [
  ...SPECIAL_COLLECTIONS.filter((c) => c.flag).map((c) => ({
    id: c.id,
    label: c.shortTitle ?? c.title,
    test: (site) => isCollectionMember(site, c),
  })),
  { id: 'video', label: 'Has video', test: (s) => s.hasVideo },
];
export const SORTS = [
  { id: 'archive', label: 'Archive number' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'newest', label: 'Newest first' },
  { id: 'type', label: 'Card type' },
];
export const STATUS_OPTIONS = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unknown', label: 'Not recorded' },
];
export const EMPTY_FILTERS = {
  q: '',
  governorates: [],
  types: [],
  kinds: [],
  flags: [],
  themes: [],
  periods: [],
  unesco: '',
  has3D: '',
  sort: '',
};
const KEYS = {
  q: 'q',
  governorates: 'gov',
  types: 'type',
  kinds: 'kind',
  flags: 'has',
  themes: 'category',
  periods: 'period',
  unesco: 'unesco',
  has3D: 'model',
  sort: 'sort',
};
const list = (value) => (value ? value.split(',').filter(Boolean) : []);
const status = (value) => (STATUS_OPTIONS.some((option) => option.id === value) ? value : '');
const complete = (filters) => ({ ...EMPTY_FILTERS, ...filters });
export function parseFilters(params) {
  return {
    q: params.get('q') ?? '',
    governorates: list(params.get('gov')).map(getGovernorateKey),
    types: list(params.get('type')),
    kinds: list(params.get('kind')),
    flags: list(params.get('has')),
    themes: list(params.get('category')),
    // Repeated parameters preserve labels containing commas, such as multi-period records.
    periods: params.getAll('period').filter(Boolean),
    unesco: status(params.get('unesco')),
    has3D: status(params.get('model')),
    sort: params.get('sort') ?? '',
  };
}
export function serializeFilters(input, base = new URLSearchParams()) {
  const filters = complete(input),
    out = new URLSearchParams(base);
  Object.values(KEYS).forEach((key) => out.delete(key));
  for (const [field, key] of Object.entries(KEYS)) {
    const value = filters[field];
    if (field === 'periods') value.forEach((item) => out.append(key, item));
    else if (Array.isArray(value) && value.length) out.set(key, value.join(','));
    else if (typeof value === 'string' && value.trim()) out.set(key, value);
  }
  return out;
}
export function countActive(input) {
  const f = complete(input);
  return (
    (f.q.trim() ? 1 : 0) +
    ['governorates', 'types', 'kinds', 'flags', 'themes', 'periods'].reduce(
      (n, key) => n + f[key].length,
      0,
    ) +
    Number(Boolean(f.unesco)) +
    Number(Boolean(f.has3D))
  );
}
const fold = normalizeSearchText;
const flagValue = (value) =>
  value === 'yes' ? true : value === 'no' ? false : value === 'unknown' ? 'unknown' : null;
export function applyFilters(sites, input, omit) {
  const f = complete(input);
  const selected = (field) => (omit === field ? undefined : f[field]);
  const categories = new Map(sites.map((s) => [slugify(s.siteType), s.siteType]));
  const kinds = selected('kinds')?.map((id) => categories.get(id) ?? id);
  const matched = filterSites(omit === 'q' ? sites : searchSites(sites, f.q, { includeMetadata: true }), {
    governorate: selected('governorates'),
    category: kinds,
    period: selected('periods'),
    unesco: flagValue(selected('unesco')),
    has3D: flagValue(selected('has3D')),
  });
  return matched.filter(
    (s) =>
      (omit === 'types' || f.types.length === 0 || f.types.includes(String(s.cardType.tier))) &&
      (omit === 'themes' ||
        f.themes.length === 0 ||
        getHeritageCategories(s).some((id) => f.themes.includes(id))) &&
      (omit === 'flags' ||
        f.flags.every((id) => FLAG_FILTERS.find((flag) => flag.id === id)?.test(s) ?? true)),
  );
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
      const rank = (s) => relevanceRank(s, q);
      out.sort((a, b) => rank(a) - rank(b) || byName(a, b));
      break;
    }
    default:
      out.sort((a, b) => a.archiveNo.localeCompare(b.archiveNo, undefined, { numeric: true }));
  }
  return out;
}

function tally(sites, keysOf) {
  const counts = new Map();
  for (const site of sites)
    for (const key of new Set([keysOf(site)].flat().filter(Boolean)))
      counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}
export const sitePeriods = (site) => [
  ...new Set([site.period, site.civilization].filter((value) => value?.trim())),
];
export function getFacets(sites, input) {
  const filters = complete(input),
    byLabel = (a, b) => a.label.localeCompare(b.label);
  const options = (field, keysOf, labels) => {
    const counts = tally(applyFilters(sites, filters, field), keysOf);
    return [...labels].map(([id, label]) => ({ id, label: tr(label), count: counts.get(id) ?? 0 })).sort(byLabel);
  };
  const govs = new Map(
    sites.map((s) => [getGovernorateKey(s.governorate), s.governorate]).filter(([id]) => id),
  );
  const kinds = new Map(sites.filter((s) => s.siteType).map((s) => [slugify(s.siteType), s.siteType]));
  const periods = new Map(sites.flatMap((s) => sitePeriods(s).map((value) => [value, value])));
  if (sites.some((s) => sitePeriods(s).length === 0)) periods.set('__unknown__', 'Period not recorded');
  const typeCounts = tally(applyFilters(sites, filters, 'types'), (s) => String(s.cardType.tier));
  const types = CARD_TYPES.map((t) => ({
    id: String(t.tier),
    label: tr(t.shortLabel) + (t.rankLabel ? ` · ${tr(t.rankLabel)}` : ''),
    hint: tr(t.rangeLabel),
    count: typeCounts.get(String(t.tier)) ?? 0,
  }));
  if (sites.some((s) => s.cardType.tier === 0))
    types.push({
      id: '0',
      label: tr('Unclassified'),
      hint: tr('Date not recorded'),
      count: typeCounts.get('0') ?? 0,
    });
  const statusOptions = (field, canonical) => {
    const base = applyFilters(sites, filters, field);
    return STATUS_OPTIONS.map((o) => ({
      ...o,
      label: tr(o.label),
      count: base.filter((s) =>
        o.id === 'unknown' ? s[canonical] == null : s[canonical] === (o.id === 'yes'),
      ).length,
    }));
  };
  return {
    governorates: options('governorates', (s) => getGovernorateKey(s.governorate), govs),
    kinds: options('kinds', (s) => slugify(s.siteType), kinds),
    periods: options('periods', (s) => (sitePeriods(s).length ? sitePeriods(s) : ['__unknown__']), periods),
    themes: options(
      'themes',
      getHeritageCategories,
      new Map(HERITAGE_CATEGORIES.map((c) => [c.id, c.label])),
    ),
    unesco: statusOptions('unesco', 'unesco'),
    has3D: statusOptions('has3D', 'has3D'),
    types,
    flags: FLAG_FILTERS.map((f) => ({
      id: f.id,
      label: tr(f.label),
      count: applyFilters(sites, filters, 'flags').filter(f.test).length,
    })),
  };
}
export function relevanceRank(site, query) {
  const q = fold(query);
  return Math.min(
    ...getSearchNames(site).map((value) => {
      const name = fold(value);
      return name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : 3;
    }),
    3,
  );
}
