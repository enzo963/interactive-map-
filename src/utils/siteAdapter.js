import { getCardType } from './getCardType';
import { formatYearLabel, getSiteAgeYears } from './siteYears';
import { getGovernorateCode } from '../data/governorates';
import { resolveImage } from './resolveImage';
import slugify from './slugify';

/**
 * The ONLY place that knows the raw sites.json field names.
 * Components receive normalized "site" objects, so when the JSON is replaced by
 * an API or database, only this adapter changes.
 *
 * Verify the value lists below against your real data (see README):
 */
const UNESCO_NEGATIVE_VALUES = ['', 'none', 'no', 'false', 'n/a', 'na', 'not listed', 'unlisted', 'not inscribed', 'tentative', 'tentative list', 'unknown'];

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

function normalizeDeckIds(decks) {
  if (!Array.isArray(decks)) return [];
  return decks
    .map((d) => (typeof d === 'string' ? slugify(d) : slugify(d?.id ?? d?.slug ?? d?.name)))
    .filter(Boolean);
}

const safeUrl = (url, { allowRelative = false } = {}) => {
  const value = String(url ?? '').trim();
  if (/^https?:\/\//i.test(value)) return value;
  return allowRelative && value.startsWith('/') && !value.startsWith('//') ? value : '';
};

function normalizeGallery(gallery, name) {
  return gallery
    .map((item, i) => {
      const src = resolveImage(item);
      if (!src) return null;
      const isObject = typeof item === 'object' && item !== null;
      const caption = isObject ? item.caption ?? '' : '';
      const alt = (isObject && item.alt) || caption || '';
      return { src, caption, alt: alt || `${name} — image ${i + 1}`, autoAlt: !alt };
    })
    .filter(Boolean);
}

function normalizeSources(sources) {
  if (!sources) return [];
  const list = Array.isArray(sources) ? sources : [sources];
  return list
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim();
        return text ? { title: text, url: safeUrl(text), detail: '' } : null;
      }
      if (item && typeof item === 'object') {
        const title = item.title ?? item.name ?? item.citation ?? item.text ?? item.url ?? '';
        const detail = [item.author, item.publisher, item.year].filter(Boolean).join(', ');
        return title ? { title: String(title), url: safeUrl(item.url ?? item.link), detail } : null;
      }
      return null;
    })
    .filter(Boolean);
}

/** Photo credit for main_image: { author, license, license_url, source_url, year, modified }. */
function normalizeCredit(credit) {
  if (!credit || typeof credit !== 'object' || !credit.author) return null;
  return {
    author: String(credit.author),
    license: String(credit.license ?? ''),
    licenseUrl: safeUrl(credit.license_url),
    sourceUrl: safeUrl(credit.source_url),
    year: credit.year ? String(credit.year) : '',
    modified: credit.modified ? String(credit.modified) : '',
  };
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
 * Optional per-record translations:
 *   "translations": { "ar": { "name": "...", "short_description": "...", "full_description": "...", "city": "..." }, "de": { ... } }
 * Only the fields present are used; everything else falls back to the English record.
 */
const TRANSLATABLE = {
  name: 'name',
  short_description: 'shortDescription',
  full_description: 'description',
  city: 'city',
  site_type: 'siteType',
  historical_period: 'period',
  civilization: 'civilization',
  main_image_alt: 'imageAlt',
};

function normalizeTranslations(translations) {
  if (!translations || typeof translations !== 'object') return {};
  const out = {};
  for (const [lang, fields] of Object.entries(translations)) {
    if (!fields || typeof fields !== 'object') continue;
    const clean = {};
    for (const [rawKey, key] of Object.entries(TRANSLATABLE)) {
      const value = fields[rawKey];
      if (typeof value === 'string' && value.trim()) clean[key] = value.trim();
    }
    out[lang] = clean;
  }
  return out;
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
    const gallery = Array.isArray(raw.gallery) ? raw.gallery : [];
    const deckIds = normalizeDeckIds(raw.decks);
    const ageYears = getSiteAgeYears(raw);

    const unescoValue = raw.unesco_status;
    const isUnesco =
      typeof unescoValue === 'boolean'
        ? unescoValue
        : unescoValue != null && !UNESCO_NEGATIVE_VALUES.includes(String(unescoValue).trim().toLowerCase());

    const heritageStatus = String(raw.heritage_status ?? '').toLowerCase();
    const isLost = deckIds.includes('lost-heritage') || /\b(lost|destroyed)\b/.test(heritageStatus);

    const siteType = raw.site_type ?? '';

    return {
      id: String(raw.id ?? slug),
      slug,
      href: `/sites/${slug}`,
      name: raw.name ?? 'Untitled record',
      governorate: raw.governorate ?? '',
      city: raw.city ?? '',
      latitude: toCoordinate(raw.latitude),
      longitude: toCoordinate(raw.longitude),
      country: raw.country ?? 'Iraq',
      siteType,
      period: raw.historical_period ?? raw.civilization ?? '',
      dateLabel: formatYearLabel(raw.estimated_year),
      dateYear: typeof raw.estimated_year === 'number' && Number.isFinite(raw.estimated_year) ? raw.estimated_year : null,
      ageYears,
      cardType: getCardType(ageYears),
      archiveNo,
      image: resolveImage(raw.main_image ?? gallery[0]),
      imageAlt: raw.main_image_alt ?? [raw.name, siteType, raw.governorate].filter(Boolean).join(' — '),
      imageCredit: normalizeCredit(raw.main_image_credit),
      hasCustomImageAlt: Boolean(raw.main_image_alt),
      translations: normalizeTranslations(raw.translations),
      deckIds,
      civilization: raw.civilization ?? '',
      shortDescription: raw.short_description ?? '',
      description: raw.full_description ?? raw.short_description ?? '',
      gallery: normalizeGallery(gallery, raw.name ?? 'Heritage site'),
      modelUrl: safeUrl(raw.model_3d_url, { allowRelative: true }),
      videoUrl: safeUrl(raw.video_url, { allowRelative: true }),
      ourWorkTypes: Array.isArray(raw.our_work_types) ? raw.our_work_types.map(String).filter(Boolean) : [],
      ourWorkNote:
        typeof raw.our_work === 'string' && !['true', 'yes', 'false', 'no', ''].includes(raw.our_work.trim().toLowerCase())
          ? raw.our_work.trim()
          : '',
      sources: normalizeSources(raw.sources),
      timeline: normalizeTimeline(raw.timeline),
      verificationStatus: raw.verification_status ?? '',
      heritageStatus: raw.heritage_status ?? '',
      unescoStatus: typeof raw.unesco_status === 'string' ? raw.unesco_status : '',
      isUnesco,
      isLost,
      hasModel: hasValue(raw.has_3d),
      hasVideo: hasValue(raw.has_video),
      hasOurWork: hasValue(raw.our_work),
      isFeatured: raw.featured === true,
    };
  });
}
