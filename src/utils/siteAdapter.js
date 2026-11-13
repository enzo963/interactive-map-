import { isCredibleSource, sourceTier } from './sourceCredibility';
import { getCardType } from './getCardType';
import { formatYearLabel, getSiteAgeYears } from './siteYears';
import { getGovernorateCode } from '../data/governorates';
import { resolveImage } from './resolveImage';
import slugify from './slugify';
import { normalizeModelResources } from './modelResources';
import { normalizePhotogrammetryProjects } from './photogrammetry';
import { normalizeComparisons } from './comparisons';
import { normalizeHeritageExperience } from './heritageExperience';
import { normalizeHeritageMedia, getRestrictedHeritageMediaUrls, MEDIA_TYPES } from './heritageMedia';
import { safeUrl } from './urls';
import { attributionFields, mediaKey } from './mediaAttribution';

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
        // Preserve explicit image review metadata for publication-aware consumers.
        ...(isObject ? attributionFields(item) : {}),
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

// Credible sources lead in tier order (1 strongest), so a discovery site or coordinate lookup
// never reads as the primary evidence. The sort is stable: equal tiers keep their recorded order.
const sourceRank = (item) => (isCredibleSource(item) ? Number(sourceTier(item)) : 9);

function normalizeSources(sources) {
  if (!sources) return [];
  const list = (Array.isArray(sources) ? sources : [sources])
    .map((item, index) => ({ item, index, rank: typeof item === 'object' && item ? sourceRank(item) : 9 }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
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
      accessLevel: ['search-snippet', 'full-text'].includes(item.accessLevel) ? item.accessLevel : null,
      // Compatibility fields keep the existing Sources component unchanged.
      title: text(item.title) || sourceName,
      detail: text(item.detail) || [item.author, item.publisher, item.year].filter(Boolean).join(', '),
    };
  }).filter(Boolean);
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
        ...attributionFields(item),
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
    // The new contract separates the cover from the gallery. Older imports
    // retain their gallery contents and their established cover selection.
    const separateImages = Object.hasOwn(raw, 'coverImage') || Object.hasOwn(raw, 'galleryImages');
    const legacyImages = Array.isArray(raw.images);
    const galleryInput = separateImages
      ? (Array.isArray(raw.galleryImages) ? raw.galleryImages : [])
      : legacyImages ? raw.images : (Array.isArray(raw.gallery) ? raw.gallery : []);
    const restrictedMedia = getRestrictedHeritageMediaUrls(raw);
    const gallery = normalizeGallery(galleryInput, name).filter((image) => !restrictedMedia.has(mediaKey(image.src)));
    const coverInput = separateImages ? raw.coverImage : legacyImages ? raw.images[0] : raw.main_image || galleryInput[0];
    const coverImage = normalizeGallery(coverInput ? [coverInput] : [], name).find((image) => !restrictedMedia.has(mediaKey(image.src))) ?? null;
    const images = [coverImage, ...gallery].filter((image, i, all) => image && all.findIndex((other) => other?.src === image.src) === i);
    const heritageMedia = normalizeHeritageMedia(raw);
    for (const resource of heritageMedia.filter((item) => MEDIA_TYPES.find((type) => type.id === item.type)?.isImage)) {
      if (!images.some((image) => image.src === resource.src)) images.push(resource);
    }
    const deckIds = normalizeDeckIds(raw.decks ?? raw.deck_ids);
    const ageYears = getSiteAgeYears(raw);

    const unescoValue = Object.hasOwn(raw, 'unesco') ? raw.unesco : raw.unesco_status;
    const unescoText = String(unescoValue ?? '').trim().toLowerCase();
    const isUnesco = typeof unescoValue === 'boolean'
      ? unescoValue
      : ['world-heritage', 'world heritage', 'world heritage site', 'unesco world heritage site', 'inscribed', 'listed', 'unesco'].includes(unescoText);
    const canonicalUnesco = typeof unescoValue === 'boolean' ? unescoValue : isUnesco ? true
      : UNESCO_NEGATIVE_VALUES.includes(unescoText) && !['', 'unknown', 'n/a', 'na'].includes(unescoText) ? false : null;

    const { preservation, storySections, historicalEvents } = normalizeHeritageExperience(raw);
    const isLost = (preservation.verified && ['destroyed', 'lost', 'disappeared', 'heavily-damaged'].includes(preservation.state))
      || historicalEvents.some((event) => event.type === 'destruction');

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

    const siteType = text(raw.category ?? raw.site_type);
    const modelResources = normalizeModelResources({ ...raw, digital_assets: [
      ...(Array.isArray(raw.digital_assets) ? raw.digital_assets : []),
      ...heritageMedia.filter((resource) => resource.type === '3d'),
    ] });
    const photogrammetryProjects = normalizePhotogrammetryProjects(raw, { images, modelResources });
    const ownProjects = photogrammetryProjects.filter((project) => project.ourWork && project.status !== 'planned'
      && (project.models.length || project.images.length || project.documents.length));
    const ourWorkTypes = unique([...toList(raw.our_work_types), ...(documentationMeta?.methods ?? []), ...(ownProjects.length ? ['Photogrammetry'] : [])]);
    const comparisons = normalizeComparisons(raw, images);
    const hasModel = hasValue(raw.has3D ?? raw.has_3d) || Boolean(modelUrl) || modelResources.length > 0;

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
      alternativeNames: [...new Set(['alternativeNames', 'alternative_names', 'altNames', 'aliases'].flatMap((key) => Array.isArray(raw[key]) ? raw[key] : []).filter((name) => typeof name === 'string' && name.trim()))],
      siteType,
      category: siteType,
      period: raw.period ?? raw.historical_period ?? raw.civilization ?? '',
      recordedPeriod: raw.period ?? raw.historical_period ?? '',
      civilization: raw.civilization ?? '',
      dateLabel: formatYearLabel(raw.estimated_year),
      ageYears,
      cardType: getCardType(ageYears),
      archiveNo,
      image: coverImage?.src ?? null,
      imageAlt: raw.main_image_alt ?? coverImage?.alt ?? [raw.name, siteType, raw.governorate].filter(Boolean).join(' — '),
      deckIds,

      // Descriptions
      shortDescription: raw.short_description ?? '',
      description: raw.description ?? raw.full_description ?? raw.short_description ?? '',
      historicalBackground: text(raw.historical_background),

      // Status and provenance (all optional)
      heritageStatus: raw.heritage_status ?? '',
      unescoStatus: typeof raw.unesco_status === 'string' ? raw.unesco_status : '',
      preservationStatus: text(raw.preservation_status),
      preservation,
      storySections,
      historicalEvents,
      status: raw.status ?? raw.verification_status ?? '',
      verificationStatus: raw.verification_status ?? raw.status ?? '',
      lastVerified: formatDate(raw.last_verified ?? raw.verified_on),
      imageCredit: text(raw.image_credit ?? raw.main_image_credit ?? coverImage?.credit),
      mediaLicense: text(raw.media_license ?? raw.license ?? raw.licence ?? coverImage?.license),

      // Media and documentation
      gallery,
      coverImage,
      galleryImages: gallery,
      images,
      modelUrl,
      modelResources,
      photogrammetryProjects,
      comparisons,
      heritageMedia,
      videoUrl,
      videoResource: digitalAssets.find((asset) => asset.url === videoUrl) || { url: videoUrl },
      digitalAssets,
      documentationMeta,
      ourWorkTypes,
      ourWorkNote:
        typeof raw.our_work === 'string' && !['true', 'yes', 'false', 'no', ''].includes(raw.our_work.trim().toLowerCase())
          ? raw.our_work.trim()
          : '',
      sources: normalizeSources(raw.sources),
      timeline: historicalEvents,

      // Flags (evidence-based)
      isUnesco,
      unesco: canonicalUnesco,
      isLost,
      hasModel,
      has3D: hasModel ? true : typeof (raw.has3D ?? raw.has_3d) === 'boolean' ? false : null,
      hasVideo: hasValue(raw.has_video) || Boolean(videoUrl),
      hasOurWork: hasValue(raw.our_work) || ourWorkTypes.length > 0 || documentationMeta !== null || ownProjects.length > 0,
      isFeatured: raw.featured === true,
    };
  });
}
