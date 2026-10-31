import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { after, afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'PopStateEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = (media) => ({ media, matches: media.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} });
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const App = (await server.ssrLoadModule('/src/App.jsx')).default;
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
const { matchRoute } = await server.ssrLoadModule('/src/router/matchRoute.js');
const { routes } = await server.ssrLoadModule('/src/routes.jsx');
const sites = getAllSites();
const realSites = structuredClone(sites);
const HeritageCard = (await server.ssrLoadModule('/src/components/cards/HeritageCard.jsx')).default;
function approvedImage(src, siteId) {
  return { src, alt: 'Approved fixture cover', caption: '', credit: 'Fixture author', license: 'Fixture permission',
    siteId, license_status: 'verified',
    license_review: { permission: 'publication-permitted', reviewedBy: 'Test reviewer', reviewedAt: '2026-11-01',
      license: 'Fixture permission', image_url: src, evidence: [{ evidenceId: 'fixture-license-evidence' }] },
    license_tracking: { evidence_valid: true, evidence_checks: [{ valid: true }], automatically_approved: false },
    publication_approval: { status: 'approved', siteId, site_verified: true, image_url: src,
      reviewedBy: 'Test editor', reviewedAt: '2026-11-01' } };
}
const fixtureSites = normalizeSites([
  { id: 'fixture-erbil', slug: 'fixture-erbil', name: 'Erbil Fixture', governorate: 'Erbil', category: 'Citadel', period: 'Modern', description: 'Fixture description for integration tests.', coverImage: approvedImage('/fixture.jpg', 'fixture-erbil'), galleryImages: [], unesco: false, has3D: false, sources: [], estimated_year: 1900, latitude: 36.19, longitude: 44.01 },
  { id: 'fixture-nineveh', slug: 'fixture-nineveh', name: 'Nineveh Fixture', governorate: 'Nineveh', category: 'Temple', period: 'Parthian', description: 'Fixture description for integration tests.', images: [{ src: '/fixture-one.jpg', alt: 'First fixture' }, { src: '/fixture-two.jpg', alt: 'Second fixture' }], unesco: true, has3D: true, model_3d_url: '/fixture.glb', sources: [{ sourceName: 'Fixture reference', url: 'https://example.org/reference', evidenceId: 'fixture-evidence', accessedAt: '2026-10-20' }], estimated_year: 1900, latitude: 35.8, longitude: 43.1 },
]);
let root;
const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
function button(text) {
  const element = all('button').find((item) => item.textContent.trim() === text);
  assert.ok(element, `Missing button: ${text}`);
  return element;
}
async function mount(path = '/', fixtures = false) {
  if (fixtures) sites.push(...structuredClone(fixtureSites));
  window.history.replaceState(null, '', path);
  await act(async () => { root.render(React.createElement(App)); });
}
async function click(element) {
  assert.ok(element, 'Click target must exist');
  await act(async () => { element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 })); });
}
async function search(value) {
  const input = $('.hb-search__input');
  assert.ok(input);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function navigate(path) {
  await act(async () => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
  });
}
beforeEach(() => {
  sites.splice(0, sites.length, ...structuredClone(realSites));
  root = createRoot($('#root'));
});
afterEach(async () => { await act(async () => root.unmount()); });
after(async () => { await server.close(); dom.window.close(); });

test('real data: Home → Explore card → Site Details → governorate deck', async () => {
  await mount();
  assert.match($('h1').textContent, /Discover history/);
  assert.equal(Number($('.hb-stats__value').textContent), realSites.length);
  await click($('.hb-hero__actions a[href="/explore"]'));
  assert.equal(window.location.pathname, '/explore');
  await click($('.hb-grid .hb-card__link'));
  assert.equal(window.location.pathname, '/sites/hatra');
  assert.equal($('h1').textContent, 'Hatra');
  assert.ok($('.hb-site__badges').textContent.includes('UNESCO'));
  assert.match($('#overview').textContent, /fortified city/);
  assert.match($('#sources').textContent, /No source references/);
  await click($('.hb-site__decks a[href="/decks/nineveh"]'));
  assert.equal($('h1').textContent, 'Nineveh Deck');
  assert.equal(all('.hb-grid > li').length, realSites.length);
});

test('Home draw uses normalized records and opens Site Details', async () => {
  await mount();
  await click(button('Draw a card'));
  assert.ok($('.hb-flip.is-flipped .hb-card'));
  await click(button('Draw another card'));
  await click(all('a').find(a => a.textContent.trim() === 'Open site record'));
  assert.equal($('h1').textContent, 'Hatra');
});

test('Map region buttons, points and result list keep URL and selection in sync', async () => {
  await mount('/map', true);
  const nineveh = () => all('.hb-region').find(b => b.textContent.includes('Nineveh'));
  await click(nineveh());
  assert.equal(new URLSearchParams(window.location.search).get('region'), 'nineveh');
  assert.equal(all('.hb-mapx__list li').length, 2);
  await click(nineveh());
  assert.equal(new URLSearchParams(window.location.search).get('region'), null);
  const point = () => all('.hb-mapx__dot').find(b => b.getAttribute('aria-label').startsWith('Hatra,'));
  await click(point());
  assert.equal(new URLSearchParams(window.location.search).get('site'), 'hatra');
  assert.equal($('.hb-mapx__item[aria-pressed="true"]').textContent.includes('Hatra'), true);
  await click(point());
  assert.equal(new URLSearchParams(window.location.search).get('site'), null);
  await click(all('.hb-mapx__item').find(b => b.textContent.includes('Hatra')));
  await click($('.hb-mapx__selected-name a'));
  assert.equal($('h1').textContent, 'Hatra');
});

test('Map search excludes a selected card and clearing restores matching results', async () => {
  await mount('/map?region=nineveh&site=hatra', true);
  await search('NoMatchingRecord');
  assert.equal($('.hb-mapx__selected'), null);
  assert.match($('.hb-empty').textContent, /No cards match/);
  await click(button('Clear all filters'));
  assert.equal(all('.hb-mapx__list li').length, 2);
  assert.equal($('.hb-mapx__summary [role="status"]').textContent.includes('2 Cards'), true);
});

test('Map clear selection keeps the governorate selection', async () => {
  await mount('/map?region=nineveh', true);
  await click(all('.hb-mapx__item').find(b => b.textContent.includes('Hatra')));
  await click(button('Clear selection'));
  assert.equal($('.hb-mapx__selected'), null);
  assert.equal(new URLSearchParams(window.location.search).get('region'), 'nineveh');
});

test('Map focus preview counts correspond to the preview governorate', async () => {
  await mount('/map?region=nineveh&q=Fixture', true);
  const erbil = all('.hb-region').find(b => b.textContent.includes('Erbil'));
  await act(async () => erbil.focus());
  assert.equal($('#region-title').textContent, 'Erbil');
  assert.match($('.hb-regionpanel').textContent, /1 match the current filters/);
  assert.equal(new URLSearchParams(window.location.search).get('region'), 'nineveh');
});

test('Deck listing links resolve; empty decks recover to the catalogue', async () => {
  await mount('/decks', true);
  const links = all('.hb-tile__link');
  assert.ok(links.length >= 6);
  for (const link of links) assert.ok(matchRoute(routes, link.getAttribute('href')));
  await click(links.find(a => a.getAttribute('href') === '/decks/lost'));
  assert.match($('.hb-empty').textContent, /no cards yet/);
  await click(all('.hb-empty a').find(a => a.textContent === 'Browse decks'));
  assert.equal(window.location.pathname, '/decks');
});

test('Deck type filter, sorting, draw and card links work across routes', async () => {
  await mount('/decks/nineveh', true);
  assert.equal(all('.hb-grid > li').length, 2);
  const typeButton = all('[aria-label="Filter by card type"] button').find(b => b.textContent.trim() !== 'All types');
  await click(typeButton);
  assert.equal(all('.hb-grid > li').length, 1);
  await click(button('All types'));
  await act(async () => { $('.hb-sort select').value = 'name'; $('.hb-sort select').dispatchEvent(new window.Event('change', { bubbles: true })); });
  assert.equal($('.hb-grid .hb-card__title').textContent, 'Hatra');
  await click(button('Draw from this deck'));
  assert.ok(window.location.pathname.startsWith('/sites/'));
  assert.ok($('.hb-site__metadata'));
});

test('Site Details integrates canonical images, source evidence, model and related cards', async () => {
  await mount('/sites/fixture-nineveh', true);
  assert.ok(all('.hb-site__badge').some(b => b.textContent === 'View 3D model'));
  assert.equal(all('.hb-gallery > li').length, 2);
  await click($('.hb-gallery button'));
  assert.equal($('.hb-lightbox').open, true);
  await click(button('Next'));
  assert.equal($('.hb-lightbox__figure img').getAttribute('src'), '/fixture-two.jpg');
  await click(button('Close'));
  assert.equal($('.hb-lightbox').open, false);
  assert.match($('#sources').textContent, /Fixture reference/);
  assert.doesNotMatch($('#sources').textContent, /fixture-evidence|2026-10-20/);
  for (const link of all('.hb-sectionnav a')) assert.ok(document.getElementById(link.hash.slice(1)));
  assert.ok($('#model a[download]'));
  assert.ok($('#related .hb-card__link'));
  await click($('#related .hb-card__link'));
  assert.equal(window.location.pathname, '/sites/hatra');
});

test('Cards recover from a broken image without breaking site navigation', async () => {
  await mount('/explore', true);
  const card = all('.hb-card').find(c => c.textContent.includes('Erbil Fixture'));
  await act(async () => card.querySelector('img').dispatchEvent(new window.Event('error')));
  assert.ok(card.querySelector('.hb-card__placeholder'));
  await click(card.querySelector('a'));
  assert.equal($('h1').textContent, 'Erbil Fixture');
});

test('Explore and Map apply the same shared search and flag filters', async () => {
  await mount('/explore?q=Fixture&has=3d', true);
  assert.equal(all('.hb-grid > li').length, 1);
  assert.equal($('.hb-grid .hb-card__title').textContent, 'Nineveh Fixture');
  await navigate('/map?q=Fixture&has=3d');
  assert.equal(all('.hb-mapx__list li').length, 1);
  assert.match($('.hb-mapx__list').textContent, /Nineveh Fixture/);
});

test('Empty data does not crash Home, Map, Decks, Explore or 3D Archive', async () => {
  sites.splice(0);
  await mount();
  assert.ok($('h1'));
  await navigate('/map'); assert.match($('main').textContent, /No card in the archive has recorded coordinates/);
  await navigate('/decks'); assert.match($('main').textContent, /No decks to show/);
  await navigate('/explore'); assert.match($('.hb-empty').textContent, /No cards match/);
  await navigate('/3d-archive'); assert.match($('.hb-empty').textContent, /no cards yet/);
});

test('Missing sites and decks render 404 content through the real router', async () => {
  await mount('/sites/not-a-site'); assert.match($('h1').textContent, /Card not found/);
  await navigate('/decks/not-a-deck'); assert.match($('h1').textContent, /Deck not found/);
});

test('Navigating between polished pages deduplicates shared card styles', async () => {
  await mount();
  await navigate('/explore'); await navigate('/decks/nineveh'); await navigate('/sites/hatra'); await navigate('/map');
  assert.equal(all('style[data-href="hb-heritage-card-refinement"]').length, 1);
});


test('Map zoom, keyboard pan, drag and subsequent point selection cooperate', async () => {
  await mount('/map', true);
  const plot = $('.hb-mapx__plot');
  plot.getBoundingClientRect = () => ({ width: 600, height: 400, top: 0, left: 0 });
  let captured = null;
  plot.setPointerCapture = id => { captured = id; };
  plot.hasPointerCapture = id => captured === id;
  plot.releasePointerCapture = () => { captured = null; };
  await click($('[aria-label="Zoom in"]'));
  assert.equal(plot.dataset.zoomed, 'true');
  const initial = $('.hb-mapx__layer').style.transform;
  await act(async () => plot.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
  assert.notEqual($('.hb-mapx__layer').style.transform, initial);
  const point = all('.hb-mapx__dot').find(b => b.getAttribute('aria-label').startsWith('Hatra,'));
  async function pointer(target, type, x) {
    const event = new window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 100 });
    Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true }, pointerType: { value: 'mouse' } });
    await act(async () => target.dispatchEvent(event));
  }
  await pointer(point, 'pointerdown', 100);
  await pointer(plot, 'pointermove', 140);
  await pointer(plot, 'pointerup', 140);
  await click(point);
  assert.equal(new URLSearchParams(window.location.search).get('site'), null);
  await pointer(point, 'pointerdown', 140);
  await pointer(point, 'pointerup', 140);
  await click(point);
  assert.equal(new URLSearchParams(window.location.search).get('site'), 'hatra');
  await click(button('Reset'));
  assert.equal(plot.dataset.zoomed, 'false');
  assert.equal($('.hb-mapx__zoom-status').textContent, '100%');
});

test('Back/forward location changes restore Map selection and Explore search', async () => {
  await mount('/map?region=nineveh&site=hatra');
  assert.ok($('.hb-mapx__selected'));
  await click($('.hb-nav a[href="/explore"]'));
  await search('Hatra');
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'Hatra');
  // Reproduce the browser popstate event with the target history URL.
  await navigate('/map?region=nineveh&site=hatra');
  assert.ok($('.hb-mapx__selected'));
  await navigate('/explore?q=Hatra');
  assert.equal($('.hb-search__input').value, 'Hatra');
  assert.equal($('.hb-grid .hb-card__title').textContent, 'Hatra');
});


test('Card displays the approved canonical cover and retains loading and alt behavior', async () => {
  const record = normalizeSites([{ id: 'card-test', name: 'Card test', governorate: 'Erbil',
    coverImage: approvedImage('/approved.jpg', 'card-test'), galleryImages: [] }])[0];
  record.image = '/stale-legacy.jpg';
  await act(async () => root.render(React.createElement(HeritageCard, { site: record, priority: true, interactive: false })));
  assert.equal($('.hb-card__image').getAttribute('src'), '/approved.jpg');
  assert.equal($('.hb-card__image').getAttribute('alt'), 'Approved fixture cover');
  assert.equal($('.hb-card__image').getAttribute('loading'), 'eager');
});

test('Card uses a fallback for missing, unreviewed, restricted or stale approvals', async () => {
  const mutations = [null, { ...approvedImage('/image.jpg', 'card-test'), license_status: 'unknown' },
    { ...approvedImage('/image.jpg', 'card-test'), license_status: 'unverified' },
    { ...approvedImage('/image.jpg', 'card-test'), license_status: 'restricted' },
    { ...approvedImage('/image.jpg', 'card-test'), publication_approval: undefined },
    { ...approvedImage('/image.jpg', 'card-test'), src: '/changed.jpg' },
    { ...approvedImage('/image.jpg', 'card-test'), license_tracking: { evidence_valid: false } }];
  for (const coverImage of mutations) {
    const site = normalizeSites([{ id: 'card-test', name: 'Card test', governorate: 'Erbil', coverImage,
      galleryImages: [{ src: '/gallery-only.jpg' }] }])[0];
    site.image = '/legacy.jpg';
    await act(async () => root.render(React.createElement(HeritageCard, { site, interactive: false })));
    assert.equal($('.hb-card__image'), null);
    assert.match($('.hb-card__placeholder').getAttribute('aria-label'), /Card test/);
  }
});

test('Card image failure resets for a replacement cover and a different site', async () => {
  async function render(id, src) {
    const site = normalizeSites([{ id, name: id, governorate: 'Erbil', coverImage: approvedImage(src, id), galleryImages: [] }])[0];
    await act(async () => root.render(React.createElement(HeritageCard, { site, interactive: false })));
  }
  await render('first', '/one.jpg');
  await act(async () => $('.hb-card__image').dispatchEvent(new window.Event('error')));
  assert.match($('.hb-card__placeholder').textContent, /unavailable/);
  await render('first', '/two.jpg');
  assert.equal($('.hb-card__image').getAttribute('src'), '/two.jpg');
  await act(async () => $('.hb-card__image').dispatchEvent(new window.Event('error')));
  await render('second', '/two.jpg');
  assert.equal($('.hb-card__image').getAttribute('src'), '/two.jpg');
});


async function mountMediaSite({ coverImage = null, galleryImages = [] } = {}) {
  const record = normalizeSites([{ id: 'media-site', name: 'Media test', slug: 'media-test', governorate: 'Erbil',
    description: 'A heritage record with authored media for integration testing.', coverImage, galleryImages, sources: [] }])[0];
  sites.push(record);
  await mount('/sites/media-test');
}

test('Site Details combines canonical cover/gallery once, with proper alt and source attribution', async () => {
  const cover = { src: '/cover-test.jpg', alt: 'Historic stone gateway', sourceName: 'Example heritage authority',
    sourceUrl: 'https://example.org/image-page', credit: 'Example photographer', license: 'UNCONFIRMED LICENSE LABEL', license_status: 'unverified' };
  await mountMediaSite({ coverImage: cover, galleryImages: [cover, { src: '/detail-test.jpg', alt: 'Stone detail', licenseStatus: 'unknown' }] });
  assert.equal(all('.hb-gallery > li').length, 2);
  assert.equal($('.hb-gallery img').getAttribute('alt'), 'Historic stone gateway');
  assert.equal($('.hb-gallery a').getAttribute('href'), 'https://example.org/image-page');
  assert.match($('#credits').textContent, /Example photographer/);
  assert.match($('#credits').textContent, /License unverified/);
  assert.match($('#credits').textContent, /License unknown/);
  assert.doesNotMatch($('main').textContent, /UNCONFIRMED LICENSE LABEL/);
  await click($('.hb-gallery button'));
  assert.match($('.hb-lightbox').textContent, /Example heritage authority/);
  assert.doesNotMatch($('.hb-lightbox').textContent, /UNCONFIRMED LICENSE LABEL/);
});

test('Site Details shows verified license only with matching audited review; camel-case unknown cannot override it', async () => {
  const verified = { ...approvedImage('/verified-detail.jpg', 'media-site'), license: 'Verified fixture terms',
    license_url: 'https://example.org/terms', sourceName: 'Fixture source', sourceUrl: 'https://example.org/photo' };
  await mountMediaSite({ galleryImages: [verified, { ...verified, src: '/unverified-detail.jpg', licenseStatus: 'unknown' }] });
  const entries = all('.hb-gallery__attribution');
  assert.match(entries[0].textContent, /License: Verified fixture terms/);
  assert.equal(entries[0].querySelector('a[href="https://example.org/terms"]').textContent, 'Verified fixture terms');
  assert.doesNotMatch(entries[1].textContent, /License: Verified fixture terms/);
});

test('Gallery handles thumbnail and viewer failures and continues to available images', async () => {
  await mountMediaSite({ galleryImages: ['one','two','three'].map((name) => ({ src: `/${name}.jpg`, alt: `${name} view` })) });
  await act(async () => $('.hb-gallery img').dispatchEvent(new window.Event('error')));
  assert.equal($('.hb-gallery button').disabled, true);
  assert.match($('.hb-gallery').textContent, /Image unavailable/);
  await click(all('.hb-gallery button')[1]);
  await act(async () => $('.hb-lightbox__figure img').dispatchEvent(new window.Event('error')));
  assert.match($('.hb-lightbox').textContent, /Image unavailable/);
  await click(button('Next'));
  assert.equal($('.hb-lightbox__figure img').getAttribute('src'), '/three.jpg');
  await click(button('Close'));
  assert.equal($('.hb-lightbox').open, false);
});

test('Site Details shows cover-only and empty galleries, excluding restricted and wrong-site images', async () => {
  await mountMediaSite({ coverImage: { src: '/only-cover.jpg', alt: 'Only cover' }, galleryImages: [
    { src: '/restricted.jpg', alt: 'Restricted view', licenseStatus: 'restricted' },
    { src: '/wrong-site.jpg', alt: 'Another site', siteId: 'different-site' },
    { src: 'javascript:alert(1)', alt: 'Invalid image' }] });
  assert.equal(all('.hb-gallery img').length, 1);
  assert.equal($('.hb-gallery img').getAttribute('src'), '/only-cover.jpg');
  await navigate('/sites/hatra');
  assert.match($('#gallery').textContent, /No images are available/);
});


test('isolated real-source Python export flows through Heritage Card and Site Details', { skip: !process.env.HB_PIPELINE_E2E_EXPORT }, async () => {
  const raw = JSON.parse(readFileSync(process.env.HB_PIPELINE_E2E_EXPORT, 'utf8'));
  const normalized = normalizeSites(raw);
  sites.splice(0, sites.length, ...normalized);
  await mount('/explore');
  for (const id of ['site-erbil-erbil-citadel', 'site-001']) {
    const record = normalized.find((site) => site.id === id);
    assert.ok(record, `Missing selected real record: ${id}`);
    assert.equal(record.coverImage, null, 'Unverified real-image rights must not cross the export gate');
    const card = all('.hb-card').find((element) => element.querySelector('.hb-card__title')?.textContent === record.name);
    assert.ok(card.querySelector('.hb-card__placeholder'));
    await click(card.querySelector('.hb-card__link'));
    assert.equal($('h1').textContent, record.name);
    assert.ok($('#overview').textContent.includes(record.description.slice(0, 50)));
    assert.ok($('#sources a[href^="https://whc.unesco.org/"]'));
    assert.match($('#gallery').textContent, /No images are available/);
    await navigate('/explore');
  }
  const fixture = normalized.find((site) => site.name === 'Synthetic image approval fixture');
  assert.ok(fixture?.coverImage, 'Positive media path must use a separately licensed synthetic fixture');
  const card = all('.hb-card').find((element) => element.querySelector('.hb-card__title')?.textContent === fixture.name);
  assert.equal(card.querySelector('img').getAttribute('src'), fixture.coverImage.src);
  await click(card.querySelector('.hb-card__link'));
  assert.equal($('h1').textContent, fixture.name);
  assert.equal(all('.hb-gallery > li').length, 1);
  assert.match($('#credits').textContent, /License: Fixture permission/);
  assert.doesNotMatch($('main').textContent, /data[\\/]raw|record_snapshot/);
  await click($('.hb-gallery button'));
  assert.equal($('.hb-lightbox__figure img').getAttribute('src'), fixture.coverImage.src);
  await act(async () => $('.hb-gallery img').dispatchEvent(new window.Event('error')));
  assert.match($('.hb-lightbox').textContent, /Image unavailable/);
  await click(button('Close'));
});
