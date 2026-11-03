import { GOVERNORATE_NAMES, getGovernorateKey } from '../data/governorates';
import { approvedCover } from './coverApproval';
import { bestTier, crediblePublishers, isCredibleSource, sourceTier } from './sourceCredibility';

/**
 * Minimum card contract: a candidate becomes a visible card only when every
 * REQUIRED check passes. ENRICHMENT fields are added when reliable information
 * exists; a missing one is reported for follow-up but never hides a card.
 * See src/data/README.md ("Visible card contract").
 */

/** Publication status (`status`). Only these two are shown; drafts and withdrawn records stay in the data. */
export const PUBLICATION_STATUSES = ['draft', 'needs-review', 'approved', 'withdrawn'];
export const VISIBLE_STATUSES = ['needs-review', 'approved'];

/** Image status (`image_status`), which must agree with the cover actually recorded. */
export const IMAGE_STATUSES = ['none', 'pending-review', 'approved'];

/** `period_status` value for a reviewed record whose sources give no period. */
export const PERIOD_NOT_ESTABLISHED = 'not-established';

export const DESCRIPTION_LIMITS = { min: 30, max: 600 };
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');


/** The image status implied by the recorded cover. */
export function derivedImageStatus(raw) {
  if (!raw?.coverImage) return 'none';
  return approvedCover({ id: raw.id, coverImage: raw.coverImage }) ? 'approved' : 'pending-review';
}

const REQUIRED = [
  ['id', 'stable ID (lowercase letters, digits and hyphens)', (raw) => STABLE_ID.test(text(raw.id))],
  ['name', 'site name', (raw) => Boolean(text(raw.name))],
  ['governorate', 'recognised governorate', (raw) => Object.hasOwn(GOVERNORATE_NAMES, getGovernorateKey(raw.governorate))],
  ['category', 'category', (raw) => Boolean(text(raw.category))],
  ['description', `concise description (${DESCRIPTION_LIMITS.min}–${DESCRIPTION_LIMITS.max} characters, not just the name)`, (raw) => {
    const value = text(raw.description);
    return value.length >= DESCRIPTION_LIMITS.min && value.length <= DESCRIPTION_LIMITS.max && value !== text(raw.name);
  }],
  ['period', `historical period, or period_status "${PERIOD_NOT_ESTABLISHED}" when the sources give none`,
    (raw) => Boolean(text(raw.period)) || raw.period_status === PERIOD_NOT_ESTABLISHED],
  ['sources', 'at least one credible source (tier 1–3 in src/data/source-credibility.json, named, with an http(s) link)',
    (raw) => Array.isArray(raw.sources) && raw.sources.some(isCredibleSource)],
  ['status', `publication status (${PUBLICATION_STATUSES.join(', ')})`, (raw) => PUBLICATION_STATUSES.includes(raw.status)],
  ['image_status', `image status (${IMAGE_STATUSES.join(', ')}) matching the recorded cover`,
    (raw) => IMAGE_STATUSES.includes(raw.image_status) && raw.image_status === derivedImageStatus(raw)],
];

const ENRICHMENT = [
  ['coordinates', (raw) => Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude)],
  ['alternativeNames', (raw) => Array.isArray(raw.alternativeNames) && raw.alternativeNames.some((name) => text(name))],
  ['civilization', (raw) => Boolean(text(raw.civilization)) || Boolean(text(raw.period))],
  ['unesco', (raw) => typeof raw.unesco === 'boolean'],
  ['preservation', (raw) => [raw.preservation_status, raw.destruction_status, raw.heritage_status].some((value) => Boolean(text(value)))],
  ['date', (raw) => raw.estimated_year != null && raw.estimated_year !== ''],
];

/**
 * Check one raw sites.json record.
 * `missing` lists required fields that fail; `ready` is true when there are none.
 * `visible` adds the publication-status rule. `enrichment` lists optional gaps.
 */
export function checkCardReadiness(raw) {
  const record = raw && typeof raw === 'object' ? raw : {};
  const missing = REQUIRED.filter(([, , passes]) => !passes(record)).map(([field, label]) => ({ field, label }));
  const ready = missing.length === 0;
  return {
    ready,
    visible: ready && VISIBLE_STATUSES.includes(record.status),
    missing,
    enrichment: ENRICHMENT.filter(([, present]) => !present(record)).map(([field]) => field),
  };
}

export const isVisibleCard = (raw) => checkCardReadiness(raw).visible;

/** Site types whose history is layered or contested enough to want corroboration. */
const COMPLEX_CATEGORIES = ['Archaeological City', 'Historic Urban Area', 'Citadel'];

/**
 * A site that should cite more than one credible publisher where sources exist: UNESCO
 * properties, cities and historic towns, complexes with component cards, and sites whose
 * destruction or reconstruction is part of the record.
 */
export const isComplexSite = (raw, componentCount = 0) =>
  raw.unesco === true || COMPLEX_CATEGORIES.includes(text(raw.category)) || componentCount > 0
  || Boolean(text(raw.destruction_status));

/**
 * Review queue for a card. Flags never hide a card; they mark evidence to strengthen.
 *   reference-only       — best evidence is an encyclopaedia or news report (tier 3)
 *   needs-corroboration  — a complex site with fewer than two credible publishers
 *   discovery-cited      — cites a discovery-tier site (tourism, blog, user-contributed)
 *   unclassified-source  — cites a domain missing from src/data/source-credibility.json
 */
export function verificationFlags(raw, { componentCount = 0 } = {}) {
  const sources = Array.isArray(raw?.sources) ? raw.sources : [];
  const flags = [];
  if (bestTier(sources) === 3) flags.push('reference-only');
  if (isComplexSite(raw, componentCount) && crediblePublishers(sources).size < 2) flags.push('needs-corroboration');
  if (sources.some((source) => sourceTier(source) === '4')) flags.push('discovery-cited');
  if (sources.some((source) => sourceTier(source) === null)) flags.push('unclassified-source');
  return flags;
}
