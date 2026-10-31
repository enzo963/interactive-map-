import { getCardType } from './getCardType';
import { formatYearLabel, getSiteAgeYears } from './siteYears';
import { getGovernorateCode } from '../data/governorates';
import { resolveImage } from './resolveImage';
import slugify from './slugify';

/**
 * Maps canonical sites.json fields to the existing component API. Legacy field
 * names remain supported for older imports; pages do not need to change.
 * Components receive normalized "site" objects. When the JSON is replaced by an API or a
 * database, only this adapter changes.
 *
 * Principles
 *  - Every field beyond the core ones is OPTIONAL. Missing information stays missing:
 *    empty string, empty array or null. Nothing is invented or defaulted to a claim.
 *  - Flags agree with their evidence: a valid 3D / video URL, a digital asset or documentation
 *    metadata means the asset exists, even when the matching boolean was omitted.
 *  - Only http(s) URLs (and site-relative paths for local media) are ever linked or embedded.
 *
 * Verify these value lists against your real data (see Documentation.md):
 */
const UNESCO_NEGATIVE_VALUES = ['', 'none', 'no', 'false', 'n/a', 'na', 'not listed', 'unlisted', 'not inscribed', 'tentative', 'tentative list', 'unknown'];
const MODEL_ASSET_TYPES = new Set(['3d', '3d-model', '3d-models', 'model']);
const VIDEO_ASSET_TYPES = new Set(['video', 'videos']);

const text = (value) => (value === null || value === undefined ? '' : String(value).trim());

const hasValue = (v) => {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return !['', 'false', 'no', 'none', 'n/a'].includes(v.trim().toLowerCase());
  return Boolean(v);
};

const toCoordinate = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const safeUrl = (url, { allowRelative = false } = {}) => {
  const value = text(url);
  if (/^https?:\/\//i.test(value)) return value;
  return allowRelative && value.startsWith('/') && !value.startsWith('//') ? value : '';
};

const unique = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toList = (value) => {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const single = text(value);
  return single ? [single] : [];
};

/** ISO dates (YYYY, YYYY-MM, YYYY-MM-DD) become readable English; anything else is kept as written. */
function formatDate(value) {
  const raw = text(value);
  if (!raw) return '';
  const options = { timeZone: 'UTC', year: 'numeric' };
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00Z`).toLocaleDateString('en-GB', { ...options, month: 'long', day: 'numeric' });
  if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01T00:00:00Z`).toLocaleDateString('en-GB', { ...options, month: 'long' });
  return raw;
}

function normalizeDeckIds(decks) {
  if (!Array.isArray(decks)) return [];
  return decks
    .map((d) => (typeof d === 'string' ? slugify(d) : slugify(d?.id ?? d?.slug ?? d?.name)))
    .filter(Boolean);
}

function normalizeGallery(gallery, name) {
  return gallery
    .map((item, i) => {
      const src = resolveImage(item);
      if (!src) return null;
      const isObject = typeof item === 'object' && item !== null;
      const caption = isObject ? text(item.caption) : '';
      return {
        src,
        caption,
        alt: (isObject && text(item.alt)) || caption || `${name} — image ${i + 1}`,
        credit: isObject ? text(item.credit) : '',
        license: isObject ? text(item.license ?? item.licence) : '',
      };
    })
    .filter(Boolean);
}

/** Preserve authored date precision and reject malformed dates instead of inventing one. */
function sourceAccessDate(value) {
  const date = text(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month, 0);
  if (month < 1 || month > 12 || day < 1 || day > calendar.getUTCDate() || !Number.isFinite(Date.parse(date))) return null;
  return date;
}

function normalizeSources(sources) {
  if (!sources) return [];
  const list = Array.isArray(sources) ? sources : [sources];
  return list.map((item) => {
    if (typeof item === 'string') item = { sourceName: item.trim(), url: safeUrl(item) };
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const sourceName = text(item.sourceName ?? item.title ?? item.name ?? item.citation ?? item.text ?? item.url);
    if (!sourceName) return null;
    return {
      sourceName,
      url: safeUrl(item.url ?? item.link),
      evidenceId: text(item.evidenceId) || null,
      accessedAt: sourceAccessDate(item.accessedAt),
      // Compatibility fields keep the existing Sources component unchanged.
      title: text(item.title) || sourceName,
      detail: text(item.detail) || [item.author, item.publisher, item.year].filter(Boolean).join(', '),
    };
  }).filter(Boolean);
}

/** Optional. Only renders if sites.json actually has a `timeline` array. */
function normalizeTimeline(timeline) {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const when = item.year ?? item.date ?? item.period ?? '';
      const title = item.title ?? item.label ?? item.event ?? '';
      if (!title && !when) return null;
      return { when: String(when), title: String(title), description: item.description ?? '' };
    })
    .filter(Boolean);
}

/**
 * Structured digital assets: [{ type, title, url, format, description, credit, license }].
 * `typeKey` is the slugified type ("3d-model", "video", "photogrammetry"...).
 */
function normalizeDigitalAssets(assets) {
  if (!Array.isArray(assets)) return [];
  return assets
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const url = safeUrl(item.url ?? item.src ?? item.href, { allowRelative: true });
      const title = text(item.title ?? item.name);
      if (!url && !title) return null;
      const type = text(item.type);
      return {
        type,
        typeKey: slugify(type),
        title,
        url,
        format: text(item.format),
        description: text(item.description),
        credit: text(item.credit),
        license: text(item.license ?? item.licence),
      };
    })
    .filter(Boolean);
}

/** Optional project documentation metadata: { date, team, methods[], equipment[], notes } or null. */
function normalizeDocumentation(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  const meta = {
    date: formatDate(doc.date),
    team: text(doc.team),
    methods: toList(doc.methods ?? doc.method),
    equipment: toList(doc.equipment),
    notes: text(doc.notes),
  };
  return meta.date || meta.team || meta.methods.length || meta.equipment.length || meta.notes ? meta : null;
}

const pad = (n, length = 4) => String(n).padStart(length, '0');

/** Normalizes the whole dataset. Accepts [..] or { sites: [..] }. */
export function normalizeSites(input) {
  const list = Array.isArray(input) ? input : input?.sites ?? [];
  const counters = {};

  return list.map((raw, index) => {
    const code = getGovernorateCode(raw.governorate);
    counters[code] = (counters[code] ?? 0) + 1;

    // Prefer a stored archive number. Otherwise derive a provisional one.
    const numericId = Number(raw.id);
    const record = Number.isInteger(numericId) && numericId > 0 ? numericId : counters[code];
    const archiveNo = raw.archive_number ?? raw.archive_no ?? `HB-${code}-${pad(record)}`;

    const slug = raw.slug || slugify(raw.name) || String(index);
    const name = raw.name ?? 'Untitled record';
    const canonicalImages = Array.isArray(raw.images);
    const gallery = canonicalImages ? raw.images : Array.isArray(raw.gallery) ? raw.gallery : [];
    const images = normalizeGallery(gallery, name);
    const deckIds = normalizeDeckIds(raw.decks ?? raw.deck_ids);
    const ageYears = getSiteAgeYears(raw);

    const unescoValue = raw.unesco ?? raw.unesco_status;
    const isUnesco =
      typeof unescoValue === 'boolean'
        ? unescoValue
        : unescoValue != null && !UNESCO_NEGATIVE_VALUES.includes(String(unescoValue).trim().toLowerCase());

    const heritageStatus = String(raw.heritage_status ?? '').toLowerCase();
    const isLost = deckIds.includes('lost') || deckIds.includes('lost-heritage') || /\b(lost|destroyed)\b/.test(heritageStatus);

    // Digital assets: evidence-based flags
    const digitalAssets = normalizeDigitalAssets(raw.digital_assets);
    const modelUrl =
      safeUrl(raw.model_3d_url, { allowRelative: true }) ||
      digitalAssets.find((a) => MODEL_ASSET_TYPES.has(a.typeKey) && a.url)?.url ||
      '';
    const videoUrl =
      safeUrl(raw.video_url, { allowRelative: true }) ||
      digitalAssets.find((a) => VIDEO_ASSET_TYPES.has(a.typeKey) && a.url)?.url ||
      '';
    const documentationMeta = normalizeDocumentation(raw.documentation);
    const ourWorkTypes = unique([...toList(raw.our_work_types), ...(documentationMeta?.methods ?? [])]);

    const siteType = text(raw.category ?? raw.site_type);
    const hasModel = hasValue(raw.has3D ?? raw.has_3d) || Boolean(modelUrl);

    return {
      id: String(raw.id ?? slug),
      slug,
      href: `/sites/${slug}`,
      name,
      governorate: raw.governorate ?? '',
      city: raw.city ?? '',
      country: raw.country ?? 'Iraq',
      latitude: toCoordinate(raw.latitude),
      longitude: toCoordinate(raw.longitude),
      siteType,
      category: siteType,
      period: raw.period ?? raw.historical_period ?? raw.civilization ?? '',
      civilization: raw.civilization ?? '',
      dateLabel: formatYearLabel(raw.estimated_year),
      ageYears,
      cardType: getCardType(ageYears),
      archiveNo,
      image: resolveImage(canonicalImages ? images[0] : raw.main_image || gallery[0]),
      imageAlt: raw.main_image_alt ?? images[0]?.alt ?? [raw.name, siteType, raw.governorate].filter(Boolean).join(' — '),
      deckIds,

      // Descriptions
      shortDescription: raw.short_description ?? '',
      description: raw.description ?? raw.full_description ?? raw.short_description ?? '',
      historicalBackground: text(raw.historical_background),

      // Status and provenance (all optional)
      heritageStatus: raw.heritage_status ?? '',
      unescoStatus: typeof raw.unesco_status === 'string' ? raw.unesco_status : '',
      preservationStatus: text(raw.preservation_status),
      verificationStatus: raw.verification_status ?? '',
      lastVerified: formatDate(raw.last_verified ?? raw.verified_on),
      imageCredit: text(raw.image_credit ?? raw.main_image_credit),
      mediaLicense: text(raw.media_license ?? raw.license ?? raw.licence),

      // Media and documentation
      gallery: images,
      images,
      modelUrl,
      videoUrl,
      digitalAssets,
      documentationMeta,
      ourWorkTypes,
      ourWorkNote:
        typeof raw.our_work === 'string' && !['true', 'yes', 'false', 'no', ''].includes(raw.our_work.trim().toLowerCase())
          ? raw.our_work.trim()
          : '',
      sources: normalizeSources(raw.sources),
      timeline: normalizeTimeline(raw.timeline),

      // Flags (evidence-based)
      isUnesco,
      unesco: isUnesco,
      isLost,
      hasModel,
      has3D: hasModel,
      hasVideo: hasValue(raw.has_video) || Boolean(videoUrl),
      hasOurWork: hasValue(raw.our_work) || ourWorkTypes.length > 0 || documentationMeta !== null,
      isFeatured: raw.featured === true,
    };
  });
}
