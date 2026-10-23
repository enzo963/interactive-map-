import { getCardType } from './getCardType';
import { formatYearLabel, getSiteAgeYears } from './siteYears';
import { getGovernorateCode } from '../data/governorates';
import { resolveImage } from './resolveImage';

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

const slugify = (v) =>
  String(v ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function normalizeDeckIds(decks) {
  if (!Array.isArray(decks)) return [];
  return decks
    .map((d) => (typeof d === 'string' ? slugify(d) : slugify(d?.id ?? d?.slug ?? d?.name)))
    .filter(Boolean);
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
      country: raw.country ?? 'Iraq',
      siteType,
      period: raw.historical_period ?? raw.civilization ?? '',
      dateLabel: formatYearLabel(raw.estimated_year),
      ageYears,
      cardType: getCardType(ageYears),
      archiveNo,
      image: resolveImage(raw.main_image ?? gallery[0]),
      imageAlt: raw.main_image_alt ?? [raw.name, siteType, raw.governorate].filter(Boolean).join(' — '),
      deckIds,
      isUnesco,
      isLost,
      hasModel: hasValue(raw.has_3d),
      hasVideo: hasValue(raw.has_video),
      hasOurWork: hasValue(raw.our_work),
      isFeatured: raw.featured === true,
    };
  });
}
