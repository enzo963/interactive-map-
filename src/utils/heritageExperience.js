import { isApprovedSite } from './modelResources';
import { isCredibleSource } from './sourceCredibility';
import { safeUrl } from './urls';

export const PRESERVATION_STATES = [
  { id: 'preserved', label: 'Preserved' },
  { id: 'restored', label: 'Restored' },
  { id: 'damaged', label: 'Damaged' },
  { id: 'heavily-damaged', label: 'Heavily Damaged' },
  { id: 'reconstructed', label: 'Reconstructed' },
  { id: 'endangered', label: 'Endangered' },
  { id: 'destroyed', label: 'Destroyed' },
  { id: 'lost', label: 'Lost' },
  { id: 'disappeared', label: 'Disappeared' },
  { id: 'unknown', label: 'Unknown' },
];

export const preservationLabel = (state) => PRESERVATION_STATES.find((item) => item.id === state)?.label || 'Unknown';

export const STORY_TYPES = [
  { id: 'history', label: 'History' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'significance', label: 'Significance' },
  { id: 'restoration', label: 'Restoration' },
  { id: 'destruction', label: 'Destruction' },
  { id: 'digital-documentation', label: 'Digital Documentation' },
];

export const EVENT_TYPES = [
  { id: 'construction', label: 'Construction' },
  { id: 'renovation', label: 'Renovation' },
  { id: 'destruction', label: 'Destruction' },
  { id: 'excavation', label: 'Excavation' },
  { id: 'restoration', label: 'Restoration' },
  { id: 'reconstruction', label: 'Reconstruction' },
  { id: 'unesco-inscription', label: 'UNESCO Inscription' },
  { id: 'damage', label: 'Damage' },
];

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value.trim() : '';
const stateIds = new Set(PRESERVATION_STATES.map(({ id }) => id));
const storyLabels = new Map(STORY_TYPES.map(({ id, label }) => [id, label]));
const eventTypes = new Set(EVENT_TYPES.map(({ id }) => id));
const lossStates = new Set(['destroyed', 'lost', 'disappeared', 'heavily-damaged']);
const stateFor = (value) => {
  const id = text(value).toLowerCase();
  return stateIds.has(id) ? id : id === 'heavily damaged' ? 'heavily-damaged' : 'unknown';
};

// Validate authored calendars before parsing instants: Date.parse alone accepts rollovers.
const calendarDate = (value, today) => {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?([Zz]|[+-](\d{2}):(\d{2})))?$/.exec(value);
  if (!match) return '';
  const [, rawYear, rawMonth, rawDay, hour, minute, second, zone, offsetHour, offsetMinute] = match;
  const [year, month, day] = [rawYear, rawMonth, rawDay].map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!(year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1])) return '';
  if (!zone) return value <= today ? value : '';
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
    || (offsetHour !== undefined && (Number(offsetHour) > 23 || Number(offsetMinute) > 59))) return '';
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant <= Date.now() ? value : '';
};

function evidenceFor(claim, raw, today) {
  if (!record(claim) || !isApprovedSite(raw) || !text(String(raw.id ?? ''))
    || claim.siteId == null || claim.siteId === '' || String(claim.siteId) !== String(raw.id)
    || claim.verified === false || !text(claim.reviewedBy) || !calendarDate(claim.reviewedAt, today)) return null;
  const statuses = ['verification_status', 'verificationStatus'].filter((key) => Object.hasOwn(claim, key));
  if (!statuses.length || !statuses.every((key) => ['verified', 'approved'].includes(claim[key]))) return null;
  if (!Array.isArray(claim.sourceRefs) || !claim.sourceRefs.length || !Array.isArray(raw.sources)) return null;
  const sources = [];
  for (const reference of new Set(claim.sourceRefs)) {
    if (!text(reference)) return null;
    const matches = raw.sources.filter((source) => record(source) && source.evidenceId === reference);
    if (matches.length !== 1) return null;
    const source = matches[0];
    if (!safeUrl(source.url) || !text(source.sourceName) || !calendarDate(source.accessedAt, today)
      || source.accessLevel !== 'full-text' || !isCredibleSource(source)) return null;
    sources.push({ sourceName: text(source.sourceName), title: text(source.title) || text(source.sourceName), url: source.url,
      evidenceId: reference, accessedAt: source.accessedAt, accessLevel: source.accessLevel });
  }
  return sources;
}

/** Reusable claim gate: source references establish claims, independently of media rights. */
export function getReviewedClaimSources(claim, raw) {
  return record(raw) ? evidenceFor(claim, raw, new Date().toISOString().slice(0, 10)) : null;
}

const yearLabel = (year) => year < 0 ? `${Math.abs(year)} BCE` : String(year);
const validYear = (year, currentYear) => Number.isInteger(year) && year !== 0 && year >= -9999 && year <= currentYear;

/** Publish only explicitly reviewed claims with their own same-site evidence references. */
export function normalizeHeritageExperience(input) {
  const raw = record(input) ? input : {};
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = Number(today.slice(0, 4));
  const assessment = record(raw.preservation) ? raw.preservation : null;
  const reportedState = stateFor(Object.hasOwn(raw, 'preservation') ? assessment?.state : raw.preservation_status);
  const asOf = assessment ? calendarDate(assessment.asOf, today) : '';
  const assessmentSources = assessment && reportedState !== 'unknown'
    && (assessment.asOf == null || Boolean(asOf)) ? evidenceFor(assessment, raw, today) : null;
  const verified = Boolean(assessmentSources);
  const preservation = {
    state: verified ? reportedState : 'unknown', reportedState, verified, asOf,
    summary: verified ? text(assessment.summary) : '', sources: assessmentSources || [],
    reviewedAt: verified ? assessment.reviewedAt : '',
  };

  const seenSections = new Set();
  const seenSectionTypes = new Set();
  const storySections = (Array.isArray(raw.story_sections) ? raw.story_sections : []).flatMap((section) => {
    if (!record(section)) return [];
    const id = text(section.id); const body = text(section.text);
    if (!id || seenSections.has(id) || seenSectionTypes.has(section.type) || !body || !storyLabels.has(section.type)) return [];
    const sources = evidenceFor(section, raw, today);
    if (!sources) return [];
    seenSections.add(id);
    seenSectionTypes.add(section.type);
    return [{ id, type: section.type, title: storyLabels.get(section.type), text: body, sources, reviewedAt: section.reviewedAt }];
  });

  const seenEvents = new Set();
  const historicalEvents = (Array.isArray(raw.historical_events) ? raw.historical_events : []).flatMap((event) => {
    if (!record(event)) return [];
    const id = text(event.id); const title = text(event.title);
    const year = event.year; const endYear = event.endYear ?? null;
    const precision = Object.hasOwn(event, 'precision') ? event.precision : 'exact';
    if (!id || seenEvents.has(id) || !title || !eventTypes.has(event.type) || !validYear(year, currentYear)
      || (endYear !== null && (!validYear(endYear, currentYear) || endYear < year))
      || !['exact', 'approximate'].includes(precision)) return [];
    const date = event.date != null ? calendarDate(event.date, today) : '';
    if (event.date != null && (!date || year < 1 || Number(date.slice(0, 4)) !== year || (endYear !== null && endYear !== year))) return [];
    const sources = evidenceFor(event, raw, today);
    if (!sources) return [];
    const period = date || `${yearLabel(year)}${endYear !== null && endYear !== year ? `–${yearLabel(endYear)}` : ''}`;
    seenEvents.add(id);
    return [{ id, type: event.type, title, year, endYear, precision,
      when: `${precision === 'approximate' ? 'c. ' : ''}${period}`, date,
      description: text(event.description), sources, reviewedAt: event.reviewedAt, verified: true }];
  // Array.sort is stable, retaining authored order for equal years and dates.
  }).sort((a, b) => a.year - b.year || (a.date && b.date
    ? Date.parse(a.date) - Date.parse(b.date) : a.date.localeCompare(b.date)));

  return { preservation, storySections, historicalEvents };
}

/** Collection membership consumes normalized reviewed claims, never legacy tags. */
export function isDisappearedSite(site) {
  return Boolean(record(site) && isApprovedSite(site) && (
    (site.preservation?.verified === true && lossStates.has(site.preservation.state))
    || (Array.isArray(site.historicalEvents) && site.historicalEvents.some((event) => event?.verified === true && event.type === 'destruction'))
  ));
}
