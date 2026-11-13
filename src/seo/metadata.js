export const BRAND = 'History in Cards';

export const STATIC_PAGES = {
  '/': ['History in Cards', 'Discover Iraq’s heritage through interactive cards, maps, collections and source-backed site records with History in Cards.'],
  '/explore': ['Explore Cards', 'Search heritage cards from across Iraq. Explore historic places by name, governorate, period and the information recorded in the archive.'],
  '/timeline': ['Heritage Timeline', 'Explore approved heritage records by recorded historical period and civilization, with overlapping eras and clear uncertainty.'],
  '/civilizations': ['Civilizations & Eras', 'Discover approved heritage records through the civilizations and historical eras recorded in the archive.'],
  '/map': ['Heritage Map', 'Explore Iraq’s heritage on an interactive map. Find recorded sites, browse governorates and open individual heritage cards.'],
  '/decks': ['Heritage Decks', 'Browse History in Cards collections by governorate and theme, and discover the heritage places represented in each deck.'],
  '/collections': ['Curated collections', 'Explore approved heritage sites grouped by history, place, architecture and documentation.'],
  '/unesco': ['UNESCO World Heritage Collection', 'Explore approved records for inscribed UNESCO World Heritage properties in Iraq, with clear distinctions from tentative sites and component monuments.'],
  '/3d-archive': ['3D Model Library', 'Search verified heritage models and digital reconstructions by site, creator, creation method and format, with source and licensing information.'],
  '/disappeared-heritage': ['Disappeared Heritage', 'Explore reviewed evidence of heritage destruction, loss and severe damage, with current preservation assessments and historical events shown separately.'],
  '/image-archive': ['Historical Image Archive', 'Explore verified archival photographs with recorded dates, historical descriptions, sources, licensing and links to their heritage sites.'],
  '/about': ['About', 'Learn about History in Cards, its mission, digital heritage goals and the scope of its work documenting and sharing Iraq’s heritage.'],
  '/methodology': ['Methodology & Sources', 'Learn how History in Cards collects, sources and reviews heritage information, and how evidence and trust guide the archive.'],
  '/our-work': ['Our Work', 'Explore the scope of History in Cards work in photogrammetry, digital reconstruction, 3D documentation, research and heritage preservation.'],
  '/contact': ['Contact & Contribution', 'Find out how researchers, students, institutions and visitors can prepare heritage information to contribute to History in Cards.'],
};

export const ROUTE_ALIASES = { '/decks/unesco': '/unesco', '/decks/3d': '/3d-archive', '/decks/lost': '/disappeared-heritage' };
export const normalizePath = (path = '/') => `/${path.split('/').filter(Boolean).join('/')}`;
export const approvedSite = (site) => String(site?.status ?? site?.verification_status ?? site?.verificationStatus ?? '').toLowerCase() === 'approved';
export const publishedDeck = (deck) => Array.isArray(deck?.sites) ? deck.sites.some(approvedSite) : deck?.count > 0;

/** This application is deployed at an origin root, not a guessed/subdirectory URL. */
export function publicOrigin(value = '') {
  const input = String(value).trim();
  if (!input) return '';
  let url;
  try { url = new URL(input); } catch { throw new Error('VITE_SITE_URL must be an absolute public HTTP(S) origin URL.'); }
  const host = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0' || host === '[::1]' || /^127\./.test(host)) {
    throw new Error('VITE_SITE_URL must be a public origin URL without credentials, path, query or fragment.');
  }
  return url.origin;
}

const plainText = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const description = (value) => {
  const text = plainText(value);
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
};

export function resolveMetadata({ pathname = '/', search = '', siteUrl = '', site = null, deck = null, collection = null, era = null, unavailable = false }) {
  const origin = publicOrigin(siteUrl);
  const path = normalizePath(pathname);
  let canonicalPath = ROUTE_ALIASES[path] ?? path;
  let page = STATIC_PAGES[canonicalPath];
  let valid = Boolean(page);
  if (/^\/collections\/[^/]+$/.test(path) && collection) {
    page = [plainText(collection.title), description(collection.blurb)];
    canonicalPath = collection.href;
    valid = collection.count > 0;
  }
  if (/^\/civilizations\/[^/]+$/.test(path) && era) {
    page = [plainText(era.label), `Explore approved heritage records associated with ${plainText(era.label)} through their recorded period and civilization labels.`];
    valid = era.sites.length > 0;
  }
  if (/^\/sites\/[^/]+$/.test(path)) {
    valid = Boolean(site && approvedSite(site));
    if (site) {
      page = [plainText(site.name), description(site.description) || `Explore ${plainText(site.name)}${site.governorate ? ` in ${plainText(site.governorate)}` : ''}. View its heritage card, recorded history and sources.`];
      canonicalPath = `/sites/${encodeURIComponent(site.slug)}`;
    }
  } else if (!page && /^\/decks\/[^/]+$/.test(path) && deck) {
    page = [plainText(deck.title), description(deck.blurb) || `Explore the ${plainText(deck.title)} heritage collection in History in Cards.`];
    canonicalPath = deck.href;
    valid = publishedDeck(deck);
  }
  if (!page) page = ['Page not found', 'This address does not lead to an available heritage page. Explore the History in Cards archive to discover recorded places.'];
  if (unavailable) {
    page = ['Content unavailable', 'This heritage page is temporarily unavailable. Try again or explore other places in the History in Cards archive.'];
    valid = false;
  }
  const filtered = [...new URLSearchParams(search)].some(([key, value]) => value && !/^(utm_.+|gclid|fbclid|msclkid)$/i.test(key));
  return {
    title: page[0] === BRAND ? BRAND : `${page[0]} — ${BRAND}`,
    description: page[1],
    canonical: origin && valid ? `${origin}${canonicalPath}` : '',
    robots: origin && valid && !filtered ? 'index, follow' : 'noindex, follow',
    image: origin ? `${origin}/social-card.png` : '',
    imageAlt: 'History in Cards lettering beside three illustrated heritage cards on a cream background.',
    type: 'website',
    locale: 'en_US',
  };
}
