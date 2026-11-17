import { withBasePath } from './basePath';

/**
 * Responsive renditions written by tools/content-pipeline/optimize_images.py.
 * An image's `variants` = { base, width, height, color, avif: [widths], webp: [...], jpeg: [...] };
 * each file is `${base}-${width}.${format}` and never changes once published.
 */

/** Widths each display may draw from, smallest first. */
export const IMAGE_ROLES = {
  card: 640,     // card grids: never deliver gallery or full-size files here
  gallery: 1280, // Site Details viewer
  thumb: 320,    // gallery thumbnails
};

/**
 * `sizes` for each display. Cards crop landscape photos to a near-square frame, so a card
 * needs roughly 1.2× its own width: two columns on phones, three to five on wider screens.
 */
export const IMAGE_SIZES = {
  card: '(max-width: 40rem) 56vw, (max-width: 75rem) 30vw, 360px',
  thumb: '(max-width: 40rem) 30vw, 200px',
  gallery: '(max-width: 60rem) 100vw, 60rem',
};

const TYPES = { avif: 'image/avif', webp: 'image/webp', jpeg: 'image/jpeg' };

const valid = (variants) => Boolean(variants && typeof variants.base === 'string' && variants.base.startsWith('/')
  && Number.isFinite(variants.width) && Number.isFinite(variants.height));

/** srcset for one format, limited to the widths a display may use. */
function srcSet(variants, format, maxWidth) {
  const widths = (Array.isArray(variants[format]) ? variants[format] : []).filter((width) => width <= maxWidth);
  return widths.map((width) => `${withBasePath(variants.base)}-${width}.${format} ${width}w`).join(', ');
}

/**
 * Sources for <picture>: modern formats first, then a fallback <img> src.
 * Returns null when the image has no optimized renditions.
 */
export function pictureSources(image, role = 'card') {
  const variants = image?.variants;
  if (!valid(variants)) return null;
  const maxWidth = IMAGE_ROLES[role] ?? IMAGE_ROLES.card;
  const sources = ['avif', 'webp'].map((format) => ({ type: TYPES[format], srcSet: srcSet(variants, format, maxWidth) }))
    .filter(({ srcSet: set }) => set);
  const fallbackFormat = (variants.jpeg ?? []).length ? 'jpeg' : 'webp';
  const fallbackWidths = (variants[fallbackFormat] ?? []).filter((width) => width <= maxWidth);
  const fallbackWidth = fallbackWidths.at(-1) ?? (variants[fallbackFormat] ?? [])[0];
  return {
    sources,
    src: fallbackWidth ? `${withBasePath(variants.base)}-${fallbackWidth}.${fallbackFormat}` : null,
    width: variants.width,
    height: variants.height,
    color: typeof variants.color === 'string' ? variants.color : undefined,
  };
}
