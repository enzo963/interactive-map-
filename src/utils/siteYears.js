/**
 * Year parsing helpers.
 *
 * `estimated_year` may arrive as a number (negative = BCE) or as a string such
 * as "c. 100 BCE", "-100", "12th century". We only parse what is written; we
 * never fill in a date that is not there. Returns a signed calendar year.
 */
const CURRENT_YEAR = new Date().getFullYear();

export function parseYear(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const text = String(value).trim().toLowerCase();
  const isBce = /(\bbce\b|\bbc\b|b\.c\.)/.test(text);

  const century = text.match(/(\d{1,2})(?:st|nd|rd|th)\s+century/);
  if (century) {
    const midpoint = Number(century[1]) * 100 - 50;
    return isBce ? -midpoint : midpoint;
  }

  const digits = text.match(/-?\d{1,5}/);
  if (!digits) return null;
  const year = Number(digits[0]);
  return isBce ? -Math.abs(year) : year;
}

/** Approximate age in years, or null when no date is recorded. */
export function getSiteAgeYears(rawSite) {
  const year = parseYear(rawSite?.estimated_year);
  return year === null ? null : CURRENT_YEAR - year;
}

/** Label shown on the card. Authored strings are kept exactly as written. */
export function formatYearLabel(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (!Number.isFinite(value)) return '';
  return value < 0 ? `c. ${Math.abs(value)} BCE` : `c. ${value} CE`;
}
