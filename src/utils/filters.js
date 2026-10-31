import { getGovernorateKey } from '../data/governorates.js';
import { normalizeSearchText } from './search.js';

// Selections accept a scalar or array: OR within one field, AND across fields.
// Empty selections disable the field. Text fields use exact normalized matching.
function selections(value, normalize = normalizeSearchText) {
  return (Array.isArray(value) ? value : [value]).map(normalize).filter(Boolean);
}

function filterText(sites, selection, field, normalize = normalizeSearchText) {
  const choices = selections(selection, normalize);
  return sites.filter((site) => choices.length === 0 || choices.includes(normalize(site[field])));
}

function filterFlag(sites, value, field) {
  if (value == null || value === '' || value === 'all') return [...sites];
  if (typeof value !== 'boolean') throw new TypeError(`${field} filter must be true, false, or null.`);
  // A missing flag is unknown: it does not qualify as an explicit false.
  return sites.filter((site) => site[field] === value);
}

/** Governorate names and existing aliases (e.g. Arbil / Erbil) are equivalent. */
export function filterByGovernorate(sites, governorate) {
  return filterText(sites, governorate, 'governorate', getGovernorateKey);
}

/** Category means the normalized siteType field, not the age-based card type. */
export function filterByCategory(sites, category) {
  return filterText(sites, category, 'siteType');
}

export function filterByPeriod(sites, period) {
  return filterText(sites, period, 'period');
}

export function filterByUnesco(sites, unesco = null) {
  return filterFlag(sites, unesco, 'isUnesco');
}

export function filterBy3D(sites, has3D = null) {
  return filterFlag(sites, has3D, 'hasModel');
}

/**
 * Pure filters for normalized site records. Example:
 * filterSites(sites, { governorate: ['Nineveh', 'Erbil'], category: 'Temple',
 *   period: 'Parthian', unesco: true, has3D: false });
 * Compose with searchSites(sites, query). No UI, routing, or data changes.
 */
export function filterSites(sites, { governorate, category, period, unesco = null, has3D = null } = {}) {
  return filterBy3D(filterByUnesco(filterByPeriod(filterByCategory(
    filterByGovernorate(sites, governorate), category), period), unesco), has3D);
}
