import { checkCardReadiness, verificationFlags } from './cardReadiness';
import { approvedCover } from './coverApproval';
import { approvedGalleryImage } from './coverage';
import { bestTier } from './sourceCredibility';
import { hasVerifiedPosition } from './mapPosition';

/**
 * Field-completeness queue (npm run report:fields). It splits every gap in src/data/sites.json into:
 *
 *   BLOCKING   — the record cannot be published, or an image it shows lacks its attribution.
 *                These are the card contract's required fields (cardReadiness.js) plus attribution
 *                of every image the site displays. Fix all of them first.
 *   ENRICHMENT — optional fields that improve a card that is already published. A gap never hides
 *                a card. They are worked in passes: one field across all cards, in PASSES order,
 *                each attempt time-boxed. A card is never perfected field after field while other
 *                cards wait.
 *
 * A gap that was researched and could not be filled is recorded in
 * tools/content-pipeline/data/fields/field-decisions.json and leaves the queue, so nobody retries it.
 */

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** The contract's required fields, named as the team names them. */
const CONTRACT_LABELS = {
  id: 'Stable ID',
  name: 'Site name',
  governorate: 'Location (recognised governorate)',
  category: 'Category',
  description: 'Description (30–600 characters, not just the name)',
  period: 'Period (or period_status "not-established" when the sources give none)',
  sources: 'Source (at least one credible tier 1–3 source with a link)',
  status: 'Publication status',
  image_status: 'Image status matching the recorded cover',
};

/** Licences that need no licence link: public domain and free-use tags. Creative Commons licences need one. */
const needsLicenseUrl = (license) => /^cc[\s-]|creative commons/i.test(text(license));

/** Attribution gaps of one displayed image. */
export function attributionGaps(image) {
  const gaps = [];
  if (!text(image?.credit)) gaps.push('credit');
  if (!text(image?.license)) gaps.push('license');
  if (!text(image?.sourceUrl)) gaps.push('sourceUrl');
  if (needsLicenseUrl(image?.license) && !text(image?.license_url)) gaps.push('license_url');
  return gaps;
}

/** Publication-blocking problems of one record: [{ field, label }]. Empty when nothing blocks it. */
export function blockingProblems(record) {
  const problems = checkCardReadiness(record).missing.map(({ field }) => ({ field, label: CONTRACT_LABELS[field] ?? field }));
  const shown = [];
  if (approvedCover(record)) shown.push(['cover', record.coverImage]);
  (record.galleryImages ?? []).forEach((image, index) => {
    if (approvedGalleryImage(image, record.id)) shown.push([`gallery ${index + 1}`, image]);
  });
  for (const [where, image] of shown) {
    const gaps = attributionGaps(image);
    if (gaps.length) problems.push({ field: 'image-attribution', label: `Image attribution (${where}: ${gaps.join(', ')})` });
  }
  return problems;
}

const hasCoordinates = hasVerifiedPosition;

/**
 * Enrichment passes, in the order they are worked. Each pass is one field across every card
 * (highest-value cards first); finish or time out a pass before starting the next.
 *   missing(record, context) is true when the card lacks the field.
 */
export const PASSES = [
  {
    field: 'location', label: 'Place description', timeboxMinutes: 5,
    why: 'Neither coordinates nor a place description: a reader cannot tell where in the governorate the site is.',
    missing: (record) => !hasCoordinates(record) && !text(record.approximateLocation) && !text(record.city),
  },
  {
    field: 'coordinates', label: 'Verified position', timeboxMinutes: 10,
    why: 'Without a verified position of the site itself the card has no pin; town- or area-level points count as missing.',
    missing: (record) => !hasCoordinates(record),
  },
  {
    field: 'period', label: 'Historical period', timeboxMinutes: 10,
    why: 'The period was not established when the card was reviewed; a dated card can be found by era.',
    missing: (record) => !text(record.period),
  },
  {
    field: 'corroboration', label: 'Second credible source', timeboxMinutes: 15,
    why: 'Best evidence is an encyclopaedia or news report, or a complex site cites fewer than two credible publishers.',
    missing: (record, context) => verificationFlags(record, { componentCount: context.components[record.id] ?? 0 })
      .some((flag) => flag === 'reference-only' || flag === 'needs-corroboration'),
  },
  {
    field: 'alternativeNames', label: 'Alternative names', timeboxMinutes: 5,
    why: 'Other spellings and Arabic or Kurdish names make the card findable in search.',
    missing: (record) => !(Array.isArray(record.alternativeNames) && record.alternativeNames.some((name) => text(name))),
  },
  {
    field: 'primaryImage', label: 'Primary image', timeboxMinutes: 0,
    why: 'Worked in the primary-image queue (reports/images/image-queue.md); cards it flagged have no usable image and are settled.',
    missing: (record, context) => !approvedCover(record) && context.imageState[record.id]?.status !== 'flagged',
  },
  {
    field: 'date', label: 'Estimated year', timeboxMinutes: 5,
    why: 'Places the card on the timeline.',
    missing: (record) => record.estimated_year == null || record.estimated_year === '',
  },
  {
    field: 'preservation', label: 'Preservation or heritage status', timeboxMinutes: 5,
    why: 'Says whether the site survives, was damaged or rebuilt.',
    missing: (record) => ![record.preservation_status, record.destruction_status, record.heritage_status].some((value) => text(value)),
  },
  {
    field: 'unesco', label: 'UNESCO status', timeboxMinutes: 1,
    why: 'Yes or no against the World Heritage and Tentative lists.',
    missing: (record) => typeof record.unesco !== 'boolean',
  },
];

/** Higher first: approved cards, UNESCO properties, parents of component cards, then strongest evidence. */
function priority(record, components) {
  const tier = Number(bestTier(record.sources)) || 5;
  return (record.status === 'approved' ? 1000 : 0) + (record.unesco === true ? 500 : 0)
    + Math.min(components[record.id] ?? 0, 10) * 20 + (5 - tier) * 10;
}

/**
 * records:   the archive (src/data/sites.json)
 * decisions: { siteId: { field: { outcome: 'not-found', note, decidedAt } } } — gaps researched and not fillable
 * imageState: the primary-image queue state (siteId → { status, reason })
 */
export function buildFieldQueue(records, { decisions = {}, imageState = {} } = {}) {
  const components = {};
  for (const record of records) if (record.parentSite) components[record.parentSite] = (components[record.parentSite] ?? 0) + 1;
  const context = { components, imageState };
  const summary = (record) => ({ id: record.id, name: record.name, governorate: record.governorate, status: record.status });

  const blocking = [];
  const published = [];
  for (const record of records) {
    const problems = blockingProblems(record);
    if (problems.length) blocking.push({ ...summary(record), problems });
    // A published card whose image lacks attribution is still published (and listed as blocked until fixed).
    if (checkCardReadiness(record).visible) published.push(record);
  }
  // Approved records first: an approved record that fails the contract is an error, not a backlog.
  blocking.sort((a, b) => (b.status === 'approved') - (a.status === 'approved') || a.id.localeCompare(b.id));

  const ranked = [...published].sort((a, b) => priority(b, components) - priority(a, components) || a.id.localeCompare(b.id));
  let settledTotal = 0;
  const passes = PASSES.map((pass, index) => {
    const gaps = ranked.filter((record) => pass.missing(record, context));
    const open = gaps.filter((record) => !decisions[record.id]?.[pass.field]);
    settledTotal += gaps.length - open.length;
    return {
      order: index + 1, field: pass.field, label: pass.label, why: pass.why, timeboxMinutes: pass.timeboxMinutes,
      missing: gaps.length, settled: gaps.length - open.length, open: open.length, sites: open.map(summary),
    };
  });

  const gapsPerCard = new Map(published.map((record) => [record.id, 0]));
  for (const pass of passes) for (const site of pass.sites) gapsPerCard.set(site.id, gapsPerCard.get(site.id) + 1);
  const byGapCount = {};
  for (const n of gapsPerCard.values()) byGapCount[n] = (byGapCount[n] ?? 0) + 1;

  return {
    totals: {
      records: records.length,
      published: published.length,
      approved: published.filter((record) => record.status === 'approved').length,
      awaitingReview: published.filter((record) => record.status === 'needs-review').length,
      blocked: blocking.length,
      settled: settledTotal,
    },
    blocking,
    passes,
    byGapCount,
  };
}

/**
 * The next `limit` tasks in work order: every blocking problem, then the open passes breadth-first.
 * A card appears at most once in a batch, so a batch never turns into perfecting one card.
 */
export function nextTasks(queue, limit = 25) {
  const tasks = [];
  const seen = new Set();
  for (const item of queue.blocking) {
    if (tasks.length >= limit) return tasks;
    tasks.push({ kind: 'blocking', id: item.id, name: item.name, fields: item.problems.map((problem) => problem.field) });
    seen.add(item.id);
  }
  for (const pass of queue.passes) {
    if (!pass.timeboxMinutes) continue; // worked in its own queue
    for (const site of pass.sites) {
      if (tasks.length >= limit) return tasks;
      if (seen.has(site.id)) continue;
      tasks.push({ kind: 'enrichment', id: site.id, name: site.name, fields: [pass.field], timeboxMinutes: pass.timeboxMinutes });
      seen.add(site.id);
    }
  }
  return tasks;
}
