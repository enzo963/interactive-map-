import { BRAND } from './metadata.js';

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function tags(meta) {
  const out = [
    ['title', {}, meta.title],
    ['meta', { name: 'description', content: meta.description }],
    ['meta', { name: 'robots', content: meta.robots }],
    ['meta', { property: 'og:site_name', content: BRAND }],
    ['meta', { property: 'og:title', content: meta.title }],
    ['meta', { property: 'og:description', content: meta.description }],
    ['meta', { property: 'og:type', content: meta.type }],
    ['meta', { property: 'og:locale', content: meta.locale }],
    ['meta', { name: 'twitter:card', content: meta.image ? 'summary_large_image' : 'summary' }],
    ['meta', { name: 'twitter:title', content: meta.title }],
    ['meta', { name: 'twitter:description', content: meta.description }],
  ];
  if (meta.canonical) out.push(['link', { rel: 'canonical', href: meta.canonical }], ['meta', { property: 'og:url', content: meta.canonical }]);
  if (meta.image) out.push(
    ['meta', { property: 'og:image', content: meta.image }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: meta.imageAlt }],
    ['meta', { name: 'twitter:image', content: meta.image }],
    ['meta', { name: 'twitter:image:alt', content: meta.imageAlt }],
  );
  return out;
}

const MANAGED = 'title, meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]';

/** One owner for the head; text/attributes are assigned through DOM APIs. */
export function applyMetadata(doc, meta) {
  doc.head.querySelectorAll(MANAGED).forEach((node) => node.remove());
  for (const [name, attrs, text] of tags(meta)) {
    const node = doc.createElement(name);
    node.dataset.seo = '';
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text) node.textContent = text;
    doc.head.append(node);
  }
}

export function renderMetadata(meta) {
  return tags(meta).map(([name, attrs, text]) => `<${name} data-seo${Object.entries(attrs).map(([key, value]) => ` ${key}="${escape(value)}"`).join('')}>${name === 'title' ? `${escape(text)}</title>` : ''}`).join('\n');
}

export function replaceMetadata(html, meta) {
  const marker = /<!--\s*seo:start\s*-->[\s\S]*?<!--\s*seo:end\s*-->/;
  if (!marker.test(html)) throw new Error('Missing SEO markers in built index.html.');
  return html.replace(marker, `<!-- seo:start -->\n${renderMetadata(meta)}\n<!-- seo:end -->`);
}

export function renderRobots(origin) {
  return origin ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
}

export function renderSitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map((url) => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
