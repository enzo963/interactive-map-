import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSeo } from '../scripts/build-seo.mjs';
import { createServer } from 'vite';
import { publicOrigin, resolveMetadata, STATIC_PAGES } from '../src/seo/metadata.js';
import { applyMetadata, renderMetadata, renderRobots, renderSitemap, replaceMetadata } from '../src/seo/head.js';

const origin = 'https://history.example';
const site = { status: 'approved', slug: 'hatra', name: 'Hatra', governorate: 'Nineveh', description: 'An ancient city with monumental temples and walls.' };
const get = (pathname, options = {}) => resolveMetadata({ pathname, siteUrl: origin, ...options });

test('release metadata uses the same explicit record scope as its client build', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const { metadataPaths, metadataForLocation } = await server.ssrLoadModule('/src/seo/context.js');
    const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
    const sites = getAllSites().filter((record) => record.status === 'approved');
    assert.ok(sites.length > 0);
    assert.equal(metadataPaths(sites).filter((path) => path.startsWith('/sites/')).length, sites.length);
    const hatra = sites.find((record) => record.slug === 'hatra');
    assert.ok(hatra);
    assert.match(metadataForLocation('/sites/hatra', '', origin, false, [hatra]).title, /Hatra/);
    assert.match(metadataForLocation('/sites/hatra', '', origin, false, []).title, /Page not found/);
    assert.match(metadataForLocation('/decks/nineveh', '', origin, false, []).robots, /noindex/);
    assert.equal(metadataForLocation('/decks/nineveh', '', origin, false, [hatra]).robots, 'index, follow');
    assert.ok(!metadataPaths([]).includes('/decks/nineveh'));
    assert.ok(metadataPaths(sites).includes('/timeline'));
    assert.ok(metadataPaths(sites).includes('/civilizations/assyrian'));
    assert.equal(metadataForLocation('/civilizations/assyrian', '', origin, false, sites).robots, 'index, follow');
    assert.match(metadataForLocation('/civilizations/sasanian', '', origin, false, sites).robots, /noindex/);
    assert.match(metadataForLocation('/civilizations/not-real', '', origin, false, sites).title, /Page not found/);
  } finally {
    await server.close();
  }
});

test('SEO requires an explicit valid public origin and never guesses localhost', () => {
  assert.equal(publicOrigin(''), '');
  assert.equal(publicOrigin(' https://history.example/ '), origin);
  for (const url of ['ftp://host', 'https://user:secret@host', 'https://host/path', 'https://host/?q=1', 'http://localhost:5177', 'http://127.0.0.1:4177']) {
    assert.throws(() => publicOrigin(url), /public|origin|URL/i);
  }
  const local = resolveMetadata({ pathname: '/about', siteUrl: '' });
  assert.equal(local.canonical, '');
  assert.match(local.robots, /noindex/);
  assert.doesNotMatch(renderMetadata(local), /rel="canonical"|property="og:url"/);
});

test('every main page has distinct descriptions and complete share metadata', () => {
  const descriptions = new Set();
  for (const path of Object.keys(STATIC_PAGES)) {
    const meta = get(path);
    assert.ok(meta.title.includes('History in Cards'));
    assert.ok(meta.description.length > 40);
    descriptions.add(meta.description);
    assert.equal(meta.canonical, `${origin}${path}`);
    assert.equal(meta.image, `${origin}/social-card.png`);
    assert.equal(meta.robots, 'index, follow');
  }
  assert.equal(descriptions.size, Object.keys(STATIC_PAGES).length);
});

test('heritage metadata describes the actual approved site and canonical route', () => {
  const meta = get('/sites/hatra', { site });
  assert.equal(meta.title, 'Hatra — History in Cards');
  assert.match(meta.description, /ancient city/);
  assert.equal(meta.canonical, `${origin}/sites/hatra`);
  assert.equal(meta.robots, 'index, follow');
  const fallback = get('/sites/hatra', { site: { ...site, description: '' } });
  assert.match(fallback.description, /Hatra.*Nineveh/);
});

test('missing and draft sites, invalid/empty decks, unavailable content and unknown routes are noindex', () => {
  for (const meta of [get('/sites/missing'), get('/sites/hatra', { site: { ...site, status: 'needs-review' } }), get('/decks/invalid'), get('/decks/erbil', { deck: { id: 'erbil', title: 'Erbil Deck', count: 0, href: '/decks/erbil' } }), get('/decks/drafts', { deck: { title: 'Drafts', count: 1, href: '/decks/drafts', sites: [{ status: 'needs-review' }] } }), get('/missing'), get('/about', { unavailable: true })]) {
    assert.match(meta.robots, /noindex/);
    assert.equal(meta.canonical, '');
  }
});

test('aliases and trailing slashes canonicalize; filters are noindex but tracking is harmless', () => {
  assert.equal(get('/decks/unesco/').canonical, `${origin}/unesco`);
  assert.equal(get('/decks/3d').canonical, `${origin}/3d-archive`);
  assert.equal(get('/about/').canonical, `${origin}/about`);
  const deck = { id: 'nineveh', title: 'Nineveh Deck', blurb: 'Heritage cards recorded in Nineveh.', count: 3, href: '/decks/nineveh' };
  assert.equal(get('/decks/ninewa', { deck }).canonical, `${origin}/decks/nineveh`);
  const filtered = get('/explore', { search: '?q=Hatra&governorate=nineveh' });
  assert.match(filtered.robots, /noindex/);
  assert.equal(filtered.canonical, `${origin}/explore`);
  assert.equal(get('/about', { search: '?utm_source=archive' }).robots, 'index, follow');
});

test('HTML and XML serialization escape input and omit fake modification dates', () => {
  const meta = get('/sites/hatra', { site: { ...site, name: 'A " & <B>', description: 'A "description" & more <detail>.' } });
  const html = renderMetadata(meta);
  const dom = new JSDOM(`<head>${html}</head>`);
  assert.equal(dom.window.document.querySelector('meta[property="og:title"]').content, meta.title);
  assert.equal(dom.window.document.title, meta.title);
  assert.equal(dom.window.document.querySelectorAll('b').length, 0);
  const xml = renderSitemap([`${origin}/`, `${origin}/about`]);
  assert.doesNotMatch(xml, /lastmod|changefreq|priority/);
  assert.equal(new JSDOM(xml, { contentType: 'text/xml' }).window.document.querySelectorAll('url').length, 2);
});

test('navigation replaces stale metadata without touching unrelated head elements', () => {
  const dom = new JSDOM('<head><meta charset="utf-8"><title>Old</title><meta name="description" content="Old"><meta property="og:image" content="old.jpg"><link rel="canonical" href="https://old.example/"></head>');
  const doc = dom.window.document;
  applyMetadata(doc, get('/sites/hatra', { site }));
  applyMetadata(doc, get('/about'));
  assert.equal(doc.querySelectorAll('title').length, 1);
  assert.equal(doc.querySelectorAll('meta[name="description"]').length, 1);
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(doc.querySelector('meta[property="og:title"]').content, 'About — History in Cards');
  assert.ok(doc.querySelector('meta[charset]'));
  applyMetadata(doc, get('/missing'));
  assert.equal(doc.querySelector('link[rel="canonical"]'), null);
  assert.equal(doc.querySelector('meta[property="og:url"]'), null);
  assert.match(doc.querySelector('meta[name="robots"]').content, /noindex/);
});

test('build helpers replace only managed tags and advertise a sitemap only with a domain', () => {
  const template = '<head><meta charset="utf-8"><!-- seo:start --><title>Old</title><!-- seo:end --></head><body>App</body>';
  const html = replaceMetadata(template, get('/about'));
  assert.match(html, /<body>App<\/body>/);
  assert.doesNotMatch(html, /<title>Old/);
  assert.match(renderRobots(origin), /Sitemap: https:\/\/history.example\/sitemap.xml/);
  assert.match(renderRobots(''), /Disallow: \//);
  assert.doesNotMatch(renderRobots(''), /Sitemap:/);
});

test('SEO generator builds crawler-readable route HTML and a canonical-only publication sitemap', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'history-seo-'));
  try {
    await writeFile(join(dir, 'index.html'), '<head><!-- seo:start --><title>Old</title><!-- seo:end --></head><body><script src="/assets/app.js"></script></body>');
    const result = await buildSeo({ outDir: dir, siteUrl: origin });
    const about = new JSDOM(await readFile(join(dir, 'about.html'), 'utf8')).window.document;
    assert.equal(about.title, 'About — History in Cards');
    assert.equal(about.querySelector('link[rel="canonical"]').href, `${origin}/about`);
    const detail = new JSDOM(await readFile(join(dir, 'sites', 'hatra.html'), 'utf8')).window.document;
    assert.match(detail.title, /Hatra/);
    assert.equal(detail.querySelector('script').getAttribute('src'), '/assets/app.js');
    const xml = new JSDOM(await readFile(join(dir, 'sitemap.xml'), 'utf8'), { contentType: 'text/xml' }).window.document;
    const urls = [...xml.querySelectorAll('loc')].map((node) => node.textContent);
    assert.ok(urls.includes(`${origin}/sites/hatra`));
    assert.ok(urls.includes(`${origin}/about`));
    assert.ok(!urls.includes(`${origin}/decks/unesco`));
    assert.equal(new Set(urls).size, urls.length);
    assert.equal(urls.length, result.sitemapUrls);
    assert.match(await readFile(join(dir, '404.html'), 'utf8'), /noindex/);
    await buildSeo({ outDir: dir, siteUrl: '' });
    await assert.rejects(readFile(join(dir, 'sitemap.xml')), { code: 'ENOENT' });
    assert.doesNotMatch(await readFile(join(dir, 'about.html'), 'utf8'), /rel="canonical"|property="og:url"/);
    assert.doesNotMatch(await readFile(join(dir, 'robots.txt'), 'utf8'), /Sitemap:/);
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), 'history-seo-')));
    await rm(dir, { recursive: true, force: true });
  }
});
