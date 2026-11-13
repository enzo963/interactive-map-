import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { after, afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLLabelElement', 'Event', 'MouseEvent', 'PopStateEvent', 'Element', 'SVGElement', 'getComputedStyle']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
// jsdom has no layout: give Leaflet map containers a size so pins are laid out and clickable.
for (const [prop, size] of [['clientWidth', 800], ['clientHeight', 600]]) {
  Object.defineProperty(window.HTMLElement.prototype, prop, { configurable: true, get() { return this.classList?.contains('leaflet-container') ? size : 0; } });
}
window.matchMedia = (media) => ({ media, matches: media.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} });
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const App = (await server.ssrLoadModule('/src/App.jsx')).default;
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
const { matchRoute } = await server.ssrLoadModule('/src/router/matchRoute.js');
const { routes } = await server.ssrLoadModule('/src/routes.jsx');
const sites = getAllSites();
const importedSites = structuredClone(sites);
// Behaviour tests that assert exact counts use the curated approved records, not discovery drafts.
const approvedSites = importedSites.filter((site) => site.status === 'approved');
// A selected-site baseline keeps the existing map/age regressions deterministic.
const realSites = normalizeSites([{ ...JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8')).find((s) => s.id === 'site-001'), latitude: 35.5872, longitude: 42.7185, estimated_year: -100 }]);
const HeritageCard = (await server.ssrLoadModule('/src/components/cards/HeritageCard.jsx')).default;
const CardGrid = (await server.ssrLoadModule('/src/components/common/CardGrid.jsx')).default;
const Gallery = (await server.ssrLoadModule('/src/components/site/Gallery.jsx')).default;
const { RouterProvider, Routes } = await server.ssrLoadModule('/src/router/Router.jsx');
function approvedImage(src, siteId) {
  return { src, alt: 'Approved fixture cover', caption: '', credit: 'Fixture author', license: 'Fixture permission',
    siteId, license_status: 'verified',
    license_review: { permission: 'publication-permitted', reviewedBy: 'Test reviewer', reviewedAt: '2026-11-01',
      license: 'Fixture permission', image_url: src, evidence: [{ evidenceId: 'fixture-license-evidence', image_url: src, source_url: 'https://example.org/license-evidence' }] },
    license_tracking: { evidence_valid: true, evidence_checks: [{ valid: true, source: { evidenceId: 'fixture-license-evidence', url: 'https://example.org/license-evidence' } }], automatically_approved: false },
    publication_approval: { status: 'approved', siteId, site_verified: true, image_url: src,
      reviewedBy: 'Test editor', reviewedAt: '2026-11-01' } };
}
const fixtureSites = normalizeSites([
  { status: 'approved', verification_status: 'approved', id: 'fixture-erbil', slug: 'fixture-erbil', name: 'Erbil Fixture', governorate: 'Erbil', category: 'Citadel', period: 'Modern', description: 'Fixture description for integration tests.', coverImage: approvedImage('/fixture.jpg', 'fixture-erbil'), galleryImages: [], unesco: false, has3D: false, sources: [], estimated_year: 1900, latitude: 36.19, longitude: 44.01 },
  { status: 'approved', verification_status: 'approved', id: 'fixture-nineveh', slug: 'fixture-nineveh', name: 'Nineveh Fixture', governorate: 'Nineveh', category: 'Temple', period: 'Parthian', description: 'Fixture description for integration tests.', images: [{ src: '/fixture-one.jpg', alt: 'First fixture' }, { src: '/fixture-two.jpg', alt: 'Second fixture' }], unesco: true, has3D: true, model_3d_url: '/fixture.glb', sources: [{ sourceName: 'Fixture reference', url: 'https://example.org/reference', evidenceId: 'fixture-evidence', accessedAt: '2026-10-20' }], estimated_year: 1900, latitude: 35.8, longitude: 43.1 },
]);
function storytellingFixture(overrides = {}) {
  const source = { sourceName: 'Synthetic UNESCO reference', url: 'https://whc.unesco.org/en/list/208/', evidenceId: 'story-evidence', accessedAt: '2026-11-01', accessLevel: 'full-text' };
  const review = { siteId: 'story-fixture', verification_status: 'verified', reviewedBy: 'Fixture editor', reviewedAt: '2026-11-01', sourceRefs: ['story-evidence'] };
  return normalizeSites([{ id: 'story-fixture', name: 'Story fixture', status: 'approved', governorate: 'Erbil', category: 'Building', description: 'Synthetic UI fixture.', period: 'Modern', sources: [source],
    preservation: { ...review, state: 'restored', asOf: '2026-10-01', summary: 'Synthetic restored condition.' },
    story_sections: [{ ...review, id: 'architecture', type: 'architecture', text: 'Synthetic architecture narrative.' }, { ...review, id: 'draft', type: 'significance', text: 'PRIVATE DRAFT', verification_status: 'draft' }],
    historical_events: [{ ...review, id: 'rebuilt', type: 'restoration', title: 'Synthetic restoration', year: 2020 }, { ...review, id: 'loss', type: 'destruction', title: 'Synthetic loss', year: 2015 }, { ...review, id: 'draft-event', type: 'construction', title: 'PRIVATE EVENT', year: 1800, verified: false }], ...overrides }])[0];
}
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
  await matchRoute(routes, new URL(path, window.location.href).pathname)?.route.load?.();
  window.history.replaceState(null, '', path);
  await act(async () => { root.render(React.createElement(App)); });
}
async function click(element) {
  assert.ok(element, 'Click target must exist');
  const href = element.getAttribute('href');
  if (href?.startsWith('/')) await matchRoute(routes, new URL(href, window.location.href).pathname)?.route.load?.();
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
  await matchRoute(routes, new URL(path, window.location.href).pathname)?.route.load?.();
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

test('3D library lists individual verified models and searches creator metadata without eager viewers', async () => {
  const records = normalizeSites([{ id: 'library-site', status: 'approved', name: 'Library fixture', governorate: 'Erbil', category: 'Citadel', period: 'Ottoman',
    digital_assets: [
      { id: 'survey-model', type: '3d', title: 'Survey model', url: '/survey.glb', creator: 'Research team', creationMethod: 'Photogrammetry', year: 2025, verification_status: 'verified' },
      { id: 'second-model', type: '3d', title: 'Interior model', url: '/interior.obj', creator: 'Archive team', verification_status: 'approved' },
      { type: '3d', title: 'Draft model', url: '/draft.glb', verification_status: 'draft' },
    ] }]);
  sites.splice(0, sites.length, ...records);
  await mount('/3d-archive');
  assert.equal($('main h1').textContent, '3D Model Library');
  assert.equal(all('.hb-model-library__entry').length, 2);
  assert.equal($('.hb-model-library__filters select').getAttribute('aria-label'), 'Format');
  assert.equal($('model-viewer, iframe'), null);
  await search('Research');
  assert.equal(all('.hb-model-library__entry').length, 1);
  assert.match($('.hb-model-library__entry').textContent, /Survey model/);
  assert.ok($('.hb-model-library__entry a[href="/sites/library-fixture#model"]'));
  await navigate('/decks/3d?format=OBJ');
  assert.equal(all('.hb-model-library__entry').length, 1);
  assert.match($('.hb-model-library__entry').textContent, /Interior model/);
});

test('reviewed photogrammetry projects and comparisons connect to their site and Our Work', async () => {
  const first = approvedImage('/historical.jpg', 'project-site');
  const second = approvedImage('/current.jpg', 'project-site');
  const records = normalizeSites([{ id: 'project-site', name: 'Project fixture', status: 'approved', governorate: 'Erbil', category: 'Building',
    galleryImages: [first, second], coverImage: null,
    photogrammetry_projects: [{ id: 'field-survey', title: 'Field survey', siteId: 'project-site', verification_status: 'verified', our_work: true,
      modelUrls: ['/project.glb'], photographUrls: ['/current.jpg'], status: 'completed', reconstruction: { description: 'Roof interpretation', uncertainties: 'Roof height uncertain' } }],
    digital_assets: [{ id: 'project-model', type: '3d', title: 'Survey geometry', url: '/project.glb', verification_status: 'verified' }],
    comparisons: [{ id: 'pair', title: 'Historical and current view', siteId: 'project-site', verification_status: 'verified', type: 'historical-current',
      before: { image: '/historical.jpg', label: 'Historical view', kind: 'photograph', date: '1950' }, after: { image: '/current.jpg', label: 'Current view', kind: 'photograph', date: '2025' } }],
  }]);
  sites.splice(0, sites.length, ...records);
  await mount('/sites/project-fixture');
  assert.ok($('#projects'));
  assert.match($('#projects').textContent, /Field survey/);
  assert.match($('#projects').textContent, /Roof height uncertain/);
  assert.ok($('#comparisons input[type="range"]'));
  assert.ok($('.hb-sectionnav a[href="#comparisons"]'));
  await navigate('/our-work');
  assert.ok($('main a[href="/sites/project-fixture"]'));
});

test('map layers and historical exploration preserve the modern map and URL context', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/map?region=nineveh&q=Nimrud&view=history&era=assyrian&layer=archaeological');
  assert.equal($('.hb-mapx__leaflet').dataset.mapMode, 'history');
  assert.ok($('.leaflet-control-attribution a[href="https://www.openstreetmap.org/copyright"]'));
  assert.ok(all('.hb-mapx__item').some((item) => item.textContent.includes('Nimrud')));
  const historic = all('.hb-map-tools button').find((item) => item.textContent.trim() === 'Historical exploration');
  assert.equal(historic.getAttribute('aria-pressed'), 'true');
  const layer = all('.hb-map-tools input').find((item) => item.value === '3d');
  await click(layer);
  assert.ok(new URLSearchParams(window.location.search).getAll('layer').includes('3d'));
  await click(button('Modern map'));
  assert.equal($('.hb-mapx__leaflet').dataset.mapMode, 'modern');
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'Nimrud');
  await click(button('Reset map layers and mode'));
  assert.equal(new URLSearchParams(window.location.search).getAll('layer').length, 0);
  assert.equal(new URLSearchParams(window.location.search).get('region'), 'nineveh');
  await click($('.hb-map-tools__cluster input'));
  assert.equal($('.hb-mapx__leaflet')?.dataset.clustered, 'false');
  assert.equal(new URLSearchParams(window.location.search).get('cluster'), 'off');
  await click($('.hb-map-tools__cluster input'));
  assert.equal($('.hb-mapx__leaflet')?.dataset.clustered, 'true');
});

test('history timeline uses approved records, URL era selection and unknown-period recovery', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/timeline?era=assyrian');
  assert.equal($('main h1').textContent, 'Heritage Timeline');
  assert.equal($('.hb-history__eras button[aria-pressed="true"]').dataset.era, 'assyrian');
  const approved = new Set(approvedSites.map((site) => site.href));
  const links = all('main .hb-card__link');
  assert.ok(links.length > 0);
  assert.ok(links.every((link) => approved.has(link.getAttribute('href'))));
  assert.ok(links.some((link) => link.getAttribute('href') === '/sites/nimrud'));
  await act(async () => {
    const select = $('.hb-history__period select');
    select.value = 'Assyrian and Parthian';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.equal(new URLSearchParams(window.location.search).get('period'), 'Assyrian and Parthian');
  assert.equal(all('main .hb-card__link').length, 1);
  assert.ok($('main .hb-card__link[href="/sites/ashur-qal-at-sherqat"]') || all('main .hb-card__link').some((link) => /Ashur/.test(link.textContent)));
  await click($('.hb-history__eras button[data-era="unplaced"]'));
  assert.equal(new URLSearchParams(window.location.search).get('era'), 'unplaced');
  assert.equal(new URLSearchParams(window.location.search).has('period'), false);
  assert.match($('main').textContent, /Other or unrecorded periods/);
  assert.ok(all('main .hb-card__link').every((link) => approved.has(link.getAttribute('href'))));
  await navigate('/timeline?era=not-real');
  assert.match($('main').textContent, /Era not found/);
  await click(button('Reset history filters'));
  assert.equal(new URLSearchParams(window.location.search).has('era'), false);
});

test('civilization views share period grouping and honest empty/invalid states', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/civilizations');
  assert.equal($('main h1').textContent, 'Civilizations & Eras');
  await click($('main a[href="/civilizations/islamic"]'));
  assert.equal($('main h1').textContent, 'Islamic');
  assert.ok($('main .hb-card__link[href="/sites/abbasid-palace"]'));
  await search('no-matching-site');
  assert.match($('main').textContent, /No sites match/);
  await click(button('Reset history filters'));
  assert.ok($('main .hb-card__link[href="/sites/abbasid-palace"]'));
  await navigate('/civilizations/sasanian');
  assert.equal($('main h1').textContent, 'Sasanian');
  assert.equal(all('main .hb-card__link').length, 0);
  assert.match($('main').textContent, /No approved records for this era yet/);
  await navigate('/civilizations/not-real');
  assert.match($('main h1').textContent, /not found/i);
});

test('civilization identity stays consistent across cards, era controls and period filters', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/timeline?era=assyrian');
  const buttonMark = $('.hb-history__eras button[data-era="assyrian"] svg[data-era="assyrian"]');
  assert.ok(buttonMark);
  assert.equal(buttonMark.getAttribute('aria-hidden'), 'true');
  assert.ok($('.hb-card svg[data-era="assyrian"]'));
  assert.ok($('.hb-history__period svg[data-era="assyrian"]'));
  await navigate('/civilizations');
  assert.ok($('.hb-history__tiles a[href="/civilizations/assyrian"] svg[data-era="assyrian"]'));
  await navigate('/civilizations/assyrian');
  assert.ok($('main h1 svg[data-era="assyrian"]'));
  await navigate('/explore?period=Assyrian');
  const input = all('#explore-filters input[type="checkbox"]').find((node) => node.closest('label')?.textContent.includes('Assyrian') && node.checked);
  assert.ok(input);
  assert.ok(input.closest('label').querySelector('svg[data-era="assyrian"]'));
  assert.equal(input.closest('label').querySelector('svg').getAttribute('aria-hidden'), 'true');
  assert.match(input.closest('label').textContent, /Assyrian/);
});

test('quality: broken routes and malformed site IDs show a generic or specific recovery page', async () => {
  await mount('/a-broken-route');
  assert.equal($('h1').textContent, 'Page not found');
  assert.ok($('main a[href="/map"]'));
  await navigate('/sites/%E0%A4%A');
  assert.match($('h1').textContent, /Card not found/);
  assert.ok($('main a[href="/explore"]'));
});

test('quality: a known governorate without records is an empty deck rather than a 404', async () => {
  await mount('/decks/basra');
  assert.match($('h1').textContent, /Basra/);
  assert.ok($('main [data-state="empty"]'));
  assert.ok($('main a[href="/decks"]'));
});

test('quality: invalid map selections explain recovery without dropping search filters', async () => {
  await mount('/map?region=missing-region&site=missing-site&q=Hatra');
  assert.match($('main').textContent, /Governorate not found/);
  assert.match($('main').textContent, /Selected card not found/);
  await click(button('Remove invalid governorate'));
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'Hatra');
  assert.equal(new URLSearchParams(window.location.search).has('region'), false);
  await click(button('Clear site selection'));
  assert.equal(new URLSearchParams(window.location.search).has('site'), false);
});

test('quality: Home and Explore distinguish an empty archive from filtered no-results', async () => {
  sites.splice(0);
  await mount('/');
  assert.match($('main [data-state="empty"]').textContent, /No heritage cards yet/);
  await navigate('/explore');
  assert.match($('main [data-state="empty"]').textContent, /No heritage sites yet/);
  sites.push(...structuredClone(realSites));
  await navigate('/explore?q=definitely-not-a-place');
  assert.ok($('main [data-state="no-results"]'));
});

test('quality: missing geography has an explicit unavailable state and no invented map link', async () => {
  sites[0].governorate = '';
  sites[0].latitude = null;
  sites[0].longitude = null;
  await mount('/sites/hatra');
  assert.match($('#location').textContent, /Location unavailable/);
  assert.match($('main').textContent, /Governorate not recorded/);
  assert.equal($('main a[href="/decks/"]'), null);
  assert.equal($('#location a[href^="/map"]'), null);
});

test('quality: card pagination focuses new cards and retains the final progress announcement', async () => {
  const records = normalizeSites(Array.from({ length: 3 }, (_, i) => ({ id: `paging-${i}`, name: `Paging site ${i}`, governorate: 'Erbil' })));
  await act(async () => root.render(React.createElement(RouterProvider, null, React.createElement(CardGrid, { sites: records, pageSize: 2 }))));
  await click(button('Show 1 more'));
  assert.ok(document.activeElement === all('.hb-grid > li a')[2], 'Focus should move to the first newly revealed card');
  assert.match($('[role="status"]').textContent, /Showing 3 of 3/);
});

test('quality: gallery changes announce position and close restores the opener', async () => {
  await act(async () => root.render(React.createElement(Gallery, { images: [
    { src: '/first.jpg', alt: 'First view' }, { src: '/second.jpg', alt: 'Second view' },
  ] })));
  const opener = $('.hb-gallery__item');
  opener.focus();
  await click(opener);
  assert.equal(document.activeElement.textContent, 'Close');
  await act(async () => button('Close').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
  assert.equal(document.activeElement.textContent, 'Previous');
  await act(async () => button('Previous').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
  assert.equal(document.activeElement.textContent, 'Close');
  await click(button('Next'));
  assert.match($('dialog [role="status"]').textContent, /Image 2 of 2.*Second view/);
  await click(button('Close'));
  assert.ok(document.activeElement === opener, 'Closing the gallery should restore the original thumbnail focus');
});

test('quality: closing a failed gallery image focuses an available thumbnail or the gallery', async () => {
  await act(async () => root.render(React.createElement(Gallery, { images: [
    { src: '/broken-first.jpg', alt: 'First view' }, { src: '/broken-second.jpg', alt: 'Second view' },
  ] })));
  const thumbs = all('.hb-gallery__item');
  for (let index = 0; index < 2; index += 1) {
    await click(thumbs[index]);
    await act(async () => $('dialog img').dispatchEvent(new window.Event('error', { bubbles: true })));
    await click(button('Close'));
    const target = index === 0 ? thumbs[1] : $('.hb-gallery');
    assert.ok(document.activeElement === target, 'Failed openers need a usable focus destination');
  }
});

test('quality: map pins are keyboard buttons named after their card; Enter selects the card', async () => {
  await mount('/map', true);
  const pin = () => all('.hb-pin-wrap').find((p) => p.getAttribute('aria-label')?.startsWith('Hatra,'));
  assert.ok(pin(), 'Hatra pin must exist');
  assert.equal(pin().getAttribute('role'), 'button');
  assert.equal(pin().getAttribute('tabindex'), '0');
  await act(async () => pin().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  assert.equal(new URLSearchParams(window.location.search).get('site'), 'hatra');
});

test('quality: map pagination focuses the new result and announces the final range', async () => {
  sites.splice(0, sites.length, ...normalizeSites(Array.from({ length: 35 }, (_, i) => ({ id: `map-page-${i}`, name: `Map site ${String(i).padStart(2, '0')}`, governorate: 'Erbil' }))));
  await mount('/map?region=erbil');
  assert.equal(all('.hb-mapx__list > li').length, 30);
  await click(button('Show more'));
  assert.ok(document.activeElement === all('.hb-mapx__list > li button')[30], 'Focus should move to the first new map result');
  assert.match($('.hb-mapx__side .hb-explore__count').textContent, /Showing 35 of 35/);
});

test('quality: real suspended routes show loading and scroll to sections after they resolve', async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const LazyPage = React.lazy(() => pending);
  const scrolled = [];
  const originalScroll = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.id); };
  window.history.replaceState(null, '', '/delayed#late-section');
  try {
    await act(async () => root.render(React.createElement(RouterProvider, null,
      React.createElement(Routes, { routes: [{ path: '/delayed', component: LazyPage }], notFound: () => null }))));
    assert.ok($('main [data-state="loading"]'));
    await act(async () => finish({ default: () => React.createElement('main', { id: 'main', tabIndex: -1 },
      React.createElement('h1', null, 'Delayed content'), React.createElement('section', { id: 'late-section' }, 'Section content')) }));
    assert.equal($('h1').textContent, 'Delayed content');
    assert.ok(scrolled.includes('late-section'), 'Deep-link scrolling should occur after the suspended content commits');
  } finally { window.HTMLElement.prototype.scrollIntoView = originalScroll; }
});

test('quality: a failed route renders recovery and navigating elsewhere resets the boundary', async () => {
  const originalError = console.error;
  console.error = () => {};
  window.history.replaceState(null, '', '/failed');
  const BrokenPage = () => { throw new Error('Synthetic route render failure'); };
  try {
    await act(async () => root.render(React.createElement(RouterProvider, null,
      React.createElement(Routes, { routes: [{ path: '/failed', component: BrokenPage }, { path: '/recovered', component: () => React.createElement('main', { id: 'main' }, React.createElement('h1', null, 'Recovered')) }], notFound: () => null }))));
    assert.match($('h1').textContent, /Content unavailable/);
    assert.ok($('[data-state="error"]'));
    assert.ok(document.activeElement === $('#main'), 'Error recovery should receive keyboard focus');
    assert.ok(button('Reload page'));
    await navigate('/recovered');
    assert.equal($('h1').textContent, 'Recovered');
  } finally { console.error = originalError; }
});

for (const [path, title] of [
    ['/about', 'About History in Cards'], ['/methodology', 'Methodology & Sources'],
    ['/our-work', 'Our Work'], ['/contact', 'Contact & Contribution'],
]) {
  test(`project pages: direct route ${path} renders its content`, async () => {
    await mount(path);
    assert.equal(all('main').length, 1);
    assert.equal(all('h1').length, 1);
    assert.equal($('h1').textContent, title);
    assert.match(document.title, new RegExp(title));
    for (const link of all('main a[href^="/"]')) {
      assert.ok(matchRoute(routes, new URL(link.href).pathname), `Unresolved link: ${link.href}`);
    }
  });
}

test('project pages: About retains card guidance and states the regional scope', async () => {
  await mount('/about');
  for (const term of ['mission', 'Nineveh', 'Erbil', 'Duhok', 'Sulaymaniyah', 'Kirkuk', 'Baghdad', 'Salah al-Din', 'specimen']) {
    assert.match($('main').textContent, new RegExp(term, 'i'));
  }
  assert.ok($('main a[href="/methodology"]'));
  assert.ok($('main a[href="/our-work"]'));
});

test('project pages: methodology explains source tiers, evidence, uncertainty and approval', async () => {
  await mount('/methodology');
  const text = $('main').textContent;
  for (const term of ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'UNESCO', 'Wikimedia Commons', 'evidence', 'conflict', 'unknown', 'approval', 'license']) {
    assert.match(text, new RegExp(term, 'i'));
  }
  assert.doesNotMatch(text, /hb_pipeline|data\/raw|SHA-256|trust_tier/);
});

test('project pages: contributions do not pretend an unavailable contact channel works', async () => {
  await mount('/contact');
  assert.match($('main').textContent, /contact details.*added later/i);
  assert.match($('main').textContent, /not currently accept/i);
  assert.match($('main').textContent, /permission/i);
  assert.equal($('main form'), null);
  assert.equal($('a[href^="mailto:"]'), null);
});

test('project pages: Our Work separates intended methods from approved documentation', async () => {
  sites.splice(0);
  await mount('/our-work');
  for (const term of ['Photogrammetry', 'Digital reconstruction', '3D documentation', 'Research', 'preservation']) {
    assert.match($('main').textContent, new RegExp(term, 'i'));
  }
  assert.match($('main').textContent, /no.*published.*documentation/i);
  const records = normalizeSites([
    { id: 'work-approved', name: 'Approved survey', governorate: 'Erbil', status: 'approved', our_work: true },
    { id: 'work-draft', name: 'Unapproved survey', governorate: 'Erbil', status: 'needs-review', our_work: true },
    { id: 'not-our-work', name: 'External research', governorate: 'Erbil', status: 'approved' },
  ]);
  sites.push(...records);
  await navigate('/about');
  await navigate('/our-work');
  assert.equal(all('main .hb-card').length, 1);
  assert.match($('main .hb-card').textContent, /Approved survey/);
  assert.doesNotMatch($('main').textContent, /Unapproved survey|External research/);
});

test('project navigation: every major destination appears in the footer and project menu', async () => {
  await mount('/about');
  for (const href of ['/about', '/methodology', '/our-work', '/contact']) {
    assert.ok($(`header details a[href="${href}"]`));
    assert.ok($(`footer a[href="${href}"]`));
  }
  for (const href of ['/', '/explore', '/map', '/decks', '/unesco', '/3d-archive', '/decks/our-work']) {
    assert.ok($(`footer a[href="${href}"]`), `Missing footer destination: ${href}`);
  }
  for (const link of all('header a[href^="/"], footer a[href^="/"]')) {
    assert.ok(matchRoute(routes, new URL(link.href).pathname), `Unresolved navigation link: ${link.href}`);
  }
});

for (const [path, href] of [
    ['/decks/unesco', '/unesco'], ['/decks/3d', '/3d-archive'],
    ['/decks/our-work', '/decks'], ['/sites/hatra', '/explore'], ['/methodology', '/methodology'],
]) {
  test(`project navigation: ${path} highlights exactly one destination`, async () => {
    await mount(path);
    const current = all('header a[aria-current="page"]');
    assert.equal(current.length, 1, path);
    assert.equal(current[0].getAttribute('href'), href);
  });
}

test('project navigation: Escape closes project disclosure then mobile menu and restores focus', async () => {
  await mount('/about');
  const toggle = $('.hb-header__toggle');
  await click(toggle);
  const disclosure = $('header details');
  assert.ok(disclosure, 'Project disclosure must exist');
  await click(disclosure.querySelector('summary'));
  assert.equal(disclosure.open, true);
  disclosure.querySelector('a').focus();
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(disclosure.open, false);
  assert.equal(document.activeElement, disclosure.querySelector('summary'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, toggle);
});

test('project navigation: same-page links and history changes close menus', async () => {
  await mount('/about');
  const toggle = $('.hb-header__toggle');
  await click(toggle);
  await click($('header details summary'));
  await click($('header details a[href="/about"]'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal($('header details').open, false);
  await click(toggle);
  await click($('header details summary'));
  await navigate('/methodology');
  assert.equal($('.hb-header__toggle').getAttribute('aria-expanded'), 'false');
  assert.equal($('header details').open, false);
});

test('project navigation: repeated global searches retain input value and keyboard focus', async () => {
  await mount('/explore');
  for (const value of ['Hatra', 'Erbil']) {
    const input = $('#global-heritage-search');
    input.focus();
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await act(async () => $('.hb-global-search').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal($('#global-heritage-search').value, value);
    assert.equal(new URLSearchParams(window.location.search).get('q'), value);
    if (value === 'Erbil') assert.equal(document.activeElement, $('#global-heritage-search'));
  }
});

for (const [path, href] of [['/about/', '/about'], ['/decks/unesco/', '/unesco']]) {
  test(`project navigation: trailing slash ${path} highlights its destination`, async () => {
    await mount(path);
    const current = all('header a[aria-current="page"]');
    assert.equal(current.length, 1);
    assert.equal(current[0].getAttribute('href'), href);
  });
}

test('selected site regression: Home → Explore card → Site Details → governorate deck', async () => {
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
  assert.ok($('#sources a[href="https://whc.unesco.org/en/list/277/"]'));
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

test('Home and Decks share an approved-only draw history and rotate after exhaustion', async () => {
  const records = normalizeSites([
    { id: 'draw-a', name: 'Draw A', governorate: 'Erbil', status: 'approved' },
    { id: 'draw-b', name: 'Draw B', governorate: 'Erbil', status: 'approved' },
    { id: 'draw-draft', name: 'Draw Draft', governorate: 'Erbil', status: 'needs-review' },
  ]);
  sites.splice(0, sites.length, ...records);
  await mount();
  await click(button('Draw a card'));
  const first = $('.hb-flip.is-flipped .hb-card__link').getAttribute('href');
  assert.ok(['/sites/draw-a', '/sites/draw-b'].includes(first));
  await click(all('a').find((link) => link.textContent.trim() === 'Open site record'));
  await navigate('/decks/erbil?type=0&sort=name');
  await click(button('Draw from this deck'));
  assert.equal(window.location.pathname, first === '/sites/draw-a' ? '/sites/draw-b' : '/sites/draw-a');
  await click(all('.hb-crumbs a').find((link) => link.textContent === 'Return to results'));
  assert.equal(window.location.search, '?type=0&sort=name');
  await click(button('Draw from this deck'));
  assert.equal(window.location.pathname, first);
});

test('Map region buttons, points and result list keep URL and selection in sync', async () => {
  await mount('/map', true);
  const nineveh = () => all('.hb-region').find(b => b.textContent.includes('Nineveh'));
  await click(nineveh());
  assert.equal(new URLSearchParams(window.location.search).get('region'), 'nineveh');
  assert.equal(all('.hb-mapx__list li').length, 2);
  await click(nineveh());
  assert.equal(new URLSearchParams(window.location.search).get('region'), null);
  const point = () => all('.hb-pin-wrap').find(b => b.getAttribute('aria-label')?.startsWith('Hatra,'));
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
  assert.match($('[data-state="no-results"]').textContent, /No cards match/);
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
  await click(links.find(a => ['/decks/lost', '/disappeared-heritage'].includes(a.getAttribute('href'))));
  assert.match($('.hb-empty').textContent, /No reviewed loss records yet/);
  await click(all('.hb-empty a').find(a => a.textContent === 'Browse decks'));
  assert.equal(window.location.pathname, '/decks');
});

test('Deck type filter, sorting, draw and card links work across routes', async () => {
  await mount('/decks/nineveh', true);
  assert.equal(all('.hb-grid > li').length, 2);
  const typeButton = all('[aria-label="Filter by card type"] button').find(b => b.textContent.trim() !== 'All types');
  await click(typeButton);
  assert.equal(all('.hb-grid > li').length, 1);
  assert.ok(new URLSearchParams(window.location.search).get('type'));
  await click(button('All types'));
  await act(async () => { $('.hb-sort select').value = 'name'; $('.hb-sort select').dispatchEvent(new window.Event('change', { bubbles: true })); });
  assert.equal(new URLSearchParams(window.location.search).get('sort'), 'name');
  assert.equal($('.hb-grid .hb-card__title').textContent, 'Hatra');
  await click(button('Draw from this deck'));
  assert.ok(window.location.pathname.startsWith('/sites/'));
  assert.ok($('.hb-site__metadata'));
});

test('Site Details returns to the exact combined Explore URL and restores matching cards', async () => {
  const path = '/explore?q=Fixture&gov=Nineveh&period=Parthian&model=yes&sort=name';
  await mount(path, true);
  assert.deepEqual(all('.hb-grid .hb-card__title').map((title) => title.textContent), ['Nineveh Fixture']);
  await click($('.hb-grid .hb-card__link'));
  const back = all('.hb-crumbs a').find((link) => link.textContent === 'Return to results');
  assert.equal(back?.getAttribute('href'), path);
  await click(back);
  assert.equal(window.location.pathname + window.location.search, path);
  assert.equal($('.hb-search__input').value, 'Fixture');
  assert.equal($('.hb-sort select').value, 'name');
  assert.deepEqual(all('.hb-grid .hb-card__title').map((title) => title.textContent), ['Nineveh Fixture']);
});

test('curated collection membership, verified cover, references and scoped map agree', async () => {
  const id = 'curated-church';
  sites.splice(0, sites.length, ...normalizeSites([
    { id, slug: id, name: 'Fixture Church', status: 'approved', city: 'Mosul', governorate: 'Nineveh', category: 'Church',
      coverImage: approvedImage('/curated.jpg', id), sources: [{ sourceName: 'UNESCO fixture', url: 'https://whc.unesco.org/en/list/277/', evidenceId: 'curated-evidence' }] },
    { id: 'curated-mosque', name: 'Fixture Mosque', status: 'approved', city: 'Mosul', governorate: 'Nineveh', category: 'Mosque' },
    { id: 'outside', name: 'Outside Church', status: 'approved', city: 'Other city', governorate: 'Nineveh', category: 'Church' },
    { id: 'unreviewed', name: 'Draft Church', status: 'needs-review', city: 'Mosul', governorate: 'Nineveh', category: 'Church' },
  ]));
  await mount('/collections');
  assert.equal(all('.hb-tiles .hb-tile__link').length, 9);
  await click($('.hb-tile__link[href="/collections/mosul-religious-heritage"]'));
  assert.deepEqual(all('.hb-grid .hb-card__title').map((title) => title.textContent), ['Fixture Church', 'Fixture Mosque']);
  assert.equal($('.hb-curated__cover img').getAttribute('src'), '/curated.jpg');
  assert.match($('.hb-curated__cover figcaption').textContent, /Fixture author.*Fixture permission/s);
  assert.ok($('#collection-references + .hb-sources a[href="https://whc.unesco.org/en/list/277/"]'));
  await search('Church');
  await click(all('a').find((link) => link.textContent === 'View collection on map'));
  assert.equal(new URLSearchParams(window.location.search).get('collection'), 'mosul-religious-heritage');
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'Church');
  assert.deepEqual(all('.hb-mapx__item-name').map((element) => element.textContent), ['Fixture Church']);
  await click($('.hb-mapx__item'));
  await click($('.hb-mapx__selected-name a'));
  assert.match($('.hb-crumbs a').getAttribute('href'), /collection=mosul-religious-heritage/);
  await click($('.hb-crumbs a'));
  assert.equal(new URLSearchParams(window.location.search).get('site'), id);
  await click(button('Remove collection filter'));
  assert.equal(new URLSearchParams(window.location.search).get('collection'), null);
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'Church');
  assert.equal(new URLSearchParams(window.location.search).get('site'), id);
});

test('known empty curated collections and unknown collection IDs have distinct states', async () => {
  await mount('/collections/lost-heritage');
  assert.match($('.hb-empty').textContent, /No approved sites in this collection yet/);
  assert.ok($('.hb-curated__illustration'));
  await navigate('/collections/no-such-collection');
  assert.equal($('main h1').textContent, 'Collection not found');
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
  assert.doesNotMatch($('#sources').textContent, /fixture-evidence/);
  assert.match($('#sources').textContent, /Accessed: 2026-10-20/);
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
  await navigate('/explore'); assert.match($('.hb-empty').textContent, /No heritage sites yet/);
  await navigate('/3d-archive'); assert.match($('.hb-empty').textContent, /No verified 3D resources/);
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
  assert.equal($('.hb-card__photo-credit'), null);
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


async function mountMediaSite({ coverImage = null, galleryImages = [], ...extra } = {}) {
  const record = normalizeSites([{ id: 'media-site', name: 'Media test', slug: 'media-test', governorate: 'Erbil',
    description: 'A heritage record with authored media for integration testing.', coverImage, galleryImages, sources: [], ...extra }])[0];
  sites.push(record);
  await mount('/sites/media-test');
}

test('Site Details shows recorded source access dates and search excerpt limits', async () => {
  await mountMediaSite({ sources: [
    { sourceName: 'Excerpt reference', url: 'https://en.wikipedia.org/wiki/X', accessLevel: 'search-snippet', accessedAt: '2026-11-03' },
    { sourceName: 'Full reference', url: 'https://en.wikipedia.org/wiki/Y', accessLevel: 'full-text', accessedAt: '2026-11-03T08:30:00Z' },
    { sourceName: 'Undated reference', url: 'https://en.wikipedia.org/wiki/Z', accessedAt: '2026-02-30' },
  ] });
  const entries = all('#sources li');
  assert.match(entries[0].textContent, /Search excerpt only/);
  assert.match(entries[0].textContent, /Accessed: 2026-11-03/);
  assert.equal(entries[0].querySelector('time').dateTime, '2026-11-03');
  assert.doesNotMatch(entries[1].textContent, /Search excerpt only/);
  assert.equal(entries[1].querySelector('time').dateTime, '2026-11-03T08:30:00Z');
  assert.match(entries[1].textContent, /Accessed: 2026-11-03/);
  assert.equal(entries[2].querySelector('time'), null);
  const language = async (value) => act(async () => {
    const select = $('.hb-lang__select');
    select.value = value;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  try {
    await language('de');
    assert.match($('#sources').textContent, /Nur Suchauszug/);
    assert.match($('#sources').textContent, /Abgerufen: 2026-11-03/);
  } finally {
    await language('en');
  }
});

test('media attribution keeps existing credit punctuation without adding a second period', async () => {
  await mountMediaSite({ coverImage: { src: '/punctuated.jpg', alt: 'Fixture', credit: 'Example photographer.' } });
  assert.match($('.hb-gallery__attribution').textContent, /Credit: Example photographer\./);
  assert.doesNotMatch($('.hb-gallery__attribution').textContent, /photographer\.\./);
});

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
  verified.license_review.license = verified.license;
  verified.license_review.evidence[0].source_url = verified.sourceUrl;
  verified.license_tracking.evidence_checks[0].source.url = verified.sourceUrl;
  await mountMediaSite({ galleryImages: [verified, { ...verified, src: '/unverified-detail.jpg', licenseStatus: 'unknown' }] });
  const entries = all('.hb-gallery__attribution');
  assert.match(entries[0].textContent, /License: Verified fixture terms/);
  assert.equal(entries[0].querySelector('a[href="https://example.org/terms"]').textContent, 'Verified fixture terms');
  assert.doesNotMatch(entries[1].textContent, /License: Verified fixture terms/);
});

test('image license claims are withdrawn when reviewed terms, evidence or dates are stale', async () => {
  const valid = approvedImage('/reviewed.jpg', 'media-site');
  const variants = [
    { ...valid, license: 'CHANGED UNREVIEWED TERMS' },
    { ...valid, license_review: { ...valid.license_review, license: '' } },
    { ...valid, license_review: { ...valid.license_review, reviewedAt: '2026-02-30' } },
    { ...valid, license_review: { ...valid.license_review, evidence: [null] } },
    { ...valid, license_tracking: { evidence_valid: true, evidence_checks: [null] } },
    { ...valid, license_review: { ...valid.license_review, evidence: [{ evidenceId: 'never-audited', image_url: '/different.jpg', source_url: 'https://example.org/unrelated' }] } },
    { ...valid, license_tracking: { evidence_valid: true, evidence_checks: [{ valid: true, source: { evidenceId: 'unrelated', url: 'https://example.org/license-evidence' } }] } },
    { ...valid, sourceUrl: 'https://example.org/replaced-source' },
  ];
  for (const coverImage of variants) {
    await mountMediaSite({ coverImage });
    assert.match($('.hb-gallery__attribution').textContent, /License unverified/);
    assert.doesNotMatch($('.hb-gallery__attribution').textContent, /License:|CHANGED UNREVIEWED TERMS/);
    assert.equal($('.hb-site__card img'), null);
    sites.pop();
  }
});

test('models, videos and downloads show attribution without implying a recorded license is verified', async () => {
  await mountMediaSite({ status: 'approved', has3D: true, digital_assets: [
    { type: 'model', title: 'Research model', url: 'https://example.org/model.glb', verification_status: 'approved',
      credit: 'Model maker', sourceName: 'Model archive', sourceUrl: 'https://example.org/models', license: 'UNCONFIRMED MODEL TERMS' },
    { type: 'video', title: 'Field recording', url: 'https://www.youtube.com/watch?v=abcdef12345',
      credit: 'Film maker', sourceName: 'Video archive', sourceUrl: 'https://example.org/films', license_status: 'unknown' },
    { type: 'survey', title: 'Restricted download', url: 'https://example.org/survey.pdf', license_status: 'restricted', license: 'RESTRICTED TERMS' },
  ] });
  assert.match($('#model').textContent, /Model maker/);
  assert.match($('#model').textContent, /License unverified/);
  assert.equal($('#model a[href="https://example.org/models"]').textContent.includes('Model archive'), true);
  assert.match($('#video').textContent, /Film maker/);
  assert.match($('#video').textContent, /License unknown/);
  assert.match($('#documentation').textContent, /Media use is restricted/);
  assert.equal($('#documentation a[href="https://example.org/survey.pdf"]'), null);
  assert.doesNotMatch($('main').textContent, /UNCONFIRMED MODEL TERMS|RESTRICTED TERMS/);
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
  sites.push(normalizeSites([{ id: 'imageless-site', name: 'Imageless test', slug: 'imageless-test', governorate: 'Erbil',
    description: 'A heritage record without any approved image.', coverImage: null, galleryImages: [], sources: [] }])[0]);
  await navigate('/sites/imageless-test');
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


test('global search finds an approved alternative name and opens its record', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/');
  const input = $('#global-heritage-search');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Qasr al-Khalifa');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => $('form[aria-label="Global heritage search"]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(window.location.pathname, '/explore');
  assert.equal(all('.hb-grid > li').length, 1);
  assert.match($('.hb-grid .hb-card__title').textContent, /Caliphal Palace/);
  await click($('.hb-grid .hb-card__link'));
  assert.match($('h1').textContent, /Caliphal Palace/);
});

test('Arabic aliases, no-result recovery and search clearing preserve other filters', async () => {
  sites.splice(0, sites.length, ...structuredClone(approvedSites));
  await mount('/explore?gov=baghdad&q=' + encodeURIComponent('القصر العباسي'));
  assert.equal($('.hb-grid .hb-card__title').textContent, 'Abbasid Palace');
  await search('not-a-record');
  assert.match($('.hb-empty__title').textContent, /No sites found/);
  await click(button('Clear search'));
  assert.equal(new URLSearchParams(window.location.search).get('gov'), 'baghdad');
  assert.equal(all('.hb-grid > li').length, 6);
});

test('advanced filters combine governorate, period and explicit unknown statuses', async () => {
  sites.splice(0, sites.length, ...structuredClone(approvedSites));
  await mount('/explore?gov=baghdad&period=Ottoman&unesco=unknown&model=unknown');
  assert.equal($('h1').textContent, 'Baghdad heritage');
  assert.equal(all('.hb-grid > li').length, 3);
  assert.ok(all('.hb-grid .hb-card__title').some((c) => c.textContent === 'Al-Wazir Mosque'));
  await navigate('/explore?model=no');
  assert.match($('.hb-empty').textContent, /No sites match/);
  await navigate('/explore?unesco=yes');
  assert.equal(all('.hb-grid > li').length, 4);
  await navigate('/explore?model=unknown');
  assert.equal(all('.hb-grid > li').length, 24);
  await click(button('Show 10 more'));
  assert.equal(all('.hb-grid > li').length, 34);
});

test('category and recorded-period discovery links open meaningful results', async () => {
  sites.splice(0, sites.length, ...structuredClone(approvedSites));
  await mount('/explore');
  await click(all('.hb-discovery__category').find((a) => a.textContent.includes('Cultural')));
  assert.ok(all('.hb-grid .hb-card__title').some((c) => c.textContent === 'Red Terror Museum, Slemani'));
  assert.ok(all('.hb-grid .hb-card__title').some((c) => c.textContent === 'Qaysari Bazaar, Erbil'));
  await click(all('.hb-discovery__periods a').find((a) => a.textContent.startsWith('Abbasid ')));
  assert.equal(all('.hb-grid > li').length, 6);
  assert.match($('.hb-chips').textContent, /Abbasid/);
});

test('Map governorate handoff preserves search and displays the regional inventory', async () => {
  sites.splice(0, sites.length, ...structuredClone(approvedSites));
  await mount('/map?region=nineveh&q=mosque');
  assert.equal($('#map-result-heading').textContent, 'Nineveh heritage sites');
  assert.equal(all('.hb-mapx__list li').length, 2);
  await click(all('.hb-regionpanel a').find((a) => a.textContent === 'Browse Nineveh heritage'));
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'mosque');
  assert.equal(new URLSearchParams(window.location.search).get('gov'), 'nineveh');
  assert.equal($('h1').textContent, 'Nineveh heritage');
  assert.match($('.hb-pagehead').textContent, /7 heritage sites/);
  assert.deepEqual(all('.hb-grid .hb-card__title').map((element) => element.textContent), ['Al-Nouri Mosque and al-Hadba Minaret', 'Old City of Mosul']);
});

test('in-flow filters close with focus returned to results and retain URL selections', async () => {
  sites.splice(0, sites.length, ...structuredClone(approvedSites));
  await mount('/explore?gov=erbil');
  const toggle = $('[aria-controls="explore-filters"]');
  await click(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.ok($('#explore-filters').classList.contains('is-open'));
  await click(button('Show 4 sites'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement.id, 'explore-results');
  assert.equal(new URLSearchParams(window.location.search).get('gov'), 'erbil');
  await navigate('/map?region=nineveh');
  await click($('[aria-controls="map-filters"]'));
  await click(button('Show 7 sites'));
  assert.equal(document.activeElement.id, 'map-result-heading');
  assert.equal(new URLSearchParams(window.location.search).get('region'), 'nineveh');
});


test('imported UNESCO property locations remain clickable on the map', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  // Nearby pins cluster at country zoom, so open Nineveh, where Hatra stands on its own.
  await mount('/map?region=nineveh');
  const hatra = all('.hb-pin-wrap').find((point) => point.getAttribute('aria-label')?.startsWith('Hatra,'));
  assert.ok(hatra);
  await click(hatra);
  assert.equal(new URLSearchParams(window.location.search).get('site'), 'hatra');
  assert.equal($('#region-title').textContent, 'Nineveh');
  assert.ok($('.hb-mapx__selected .hb-card__title').textContent.includes('Hatra'));
});

const ModelViewer = (await server.ssrLoadModule('/src/components/site/ModelViewer.jsx')).default;
const verifiedResource = { url: '/fixture.glb', siteId: 'fixture', verified: true, title: 'Synthetic test model' };
const registerTestViewer = () => Promise.resolve();

test('UNESCO collection contains exactly the four approved World Heritage properties', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/unesco');
  assert.equal($('h1').textContent, 'UNESCO World Heritage Collection');
  assert.equal(all('.hb-grid > li').length, 4);
  assert.ok(all('.hb-card__title').some((c) => c.textContent === 'Samarra Archaeological City'));
  assert.ok(!all('.hb-card__title').some((c) => c.textContent.includes('Great Mosque')));
  await search('not-in-collection');
  assert.match($('.hb-empty').textContent, /No sites match/);
  await click(button('Clear search'));
  assert.equal(all('.hb-grid > li').length, 4);
  await navigate('/decks/unesco');
  assert.equal($('h1').textContent, 'UNESCO World Heritage Collection');
});
test('3D collection has an honest empty state and accepts only verified resources', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/3d-archive');
  assert.match($('.hb-empty').textContent, /No verified 3D resources/);
  assert.equal($('model-viewer, iframe'), null);
  sites.push(...normalizeSites([{ id: 'verified-model', name: 'Verified fixture', status: 'approved', has3D: true, model_3d_url: '/fixture.glb' }]));
  await navigate('/explore'); await navigate('/decks/3d');
  assert.equal(all('.hb-model-library__entry').length, 1);
  assert.ok($('.hb-model-library__entry a[href="/sites/verified-fixture#model"]'));
});
test('reusable viewer covers consent, progress, ready, error, retry and source replacement', async () => {
  await act(async () => root.render(React.createElement(ModelViewer, { resource: verifiedResource, name: 'Fixture', siteId: 'fixture', registerViewer: registerTestViewer })));
  assert.equal($('model-viewer'), null);
  await click(button('Load 3D viewer'));
  const model = $('model-viewer');
  await act(async () => model.dispatchEvent(new window.CustomEvent('progress', { detail: { totalProgress: .5 } })));
  assert.equal($('progress').value, 50);
  await act(async () => model.dispatchEvent(new window.Event('load')));
  assert.equal($('.hb-model').dataset.state, 'ready');
  await act(async () => model.dispatchEvent(new window.Event('error')));
  assert.equal($('.hb-model').dataset.state, 'error');
  await click(button('Retry viewer'));
  assert.equal($('.hb-model').dataset.state, 'loading');
  await act(async () => root.render(React.createElement(ModelViewer, { resource: { ...verifiedResource, url: '/replacement.glb' }, name: 'New fixture', registerViewer: registerTestViewer })));
  assert.equal($('.hb-model').dataset.state, 'idle');
  await act(async () => model.dispatchEvent(new window.Event('error')));
  assert.equal($('.hb-model').dataset.state, 'idle');
});
test('viewer fails gracefully on timeout and refuses unverified or unsupported embeds', async () => {
  await act(async () => root.render(React.createElement(ModelViewer, { resource: verifiedResource, name: 'Fixture', registerViewer: registerTestViewer, timeoutMs: 10 })));
  await click(button('Load 3D viewer'));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 25)));
  assert.match($('[role="alert"]').textContent, /could not be loaded/);
  await act(async () => root.render(React.createElement(ModelViewer, { resource: { ...verifiedResource, verified: false }, name: 'Fixture' })));
  assert.match($('#root').textContent, /No approved 3D resource/);
  assert.equal($('model-viewer, iframe, a'), null);
  await act(async () => root.render(React.createElement(ModelViewer, { resource: { ...verifiedResource, url: 'https://example.org/resource' }, name: 'Fixture' })));
  assert.equal($('iframe'), null);
  assert.match($('#root').textContent, /cannot be previewed/);
});
test('supported external viewer loads only after user activation', async () => {
  const id = '0123456789abcdef0123456789abcdef';
  await act(async () => root.render(React.createElement(ModelViewer, { resource: { ...verifiedResource, url: `https://sketchfab.com/models/${id}` }, name: 'Fixture' })));
  assert.equal($('iframe'), null);
  await click(button('Load 3D viewer'));
  assert.equal($('iframe').getAttribute('src'), `https://sketchfab.com/models/${id}/embed`);
  await act(async () => $('iframe').dispatchEvent(new window.Event('load')));
  assert.equal($('.hb-model').dataset.state, 'ready');
});
test('copy-link uses the saved site route and offers manual selection on clipboard failure', async (t) => {
  let copied;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (url) => { copied = url; } } });
  t.after(() => delete navigator.clipboard);
  await mount('/sites/hatra?source=search#gallery');
  await click(button('Copy link'));
  assert.equal(copied, 'http://localhost/sites/hatra');
  // A share link works locally; public SEO canonicals require the deployment domain.
  assert.equal($('link[rel="canonical"]'), null);
  assert.match($('.hb-share [role="status"]').textContent, /Link copied/);
  navigator.clipboard.writeText = async () => { throw new Error('Denied'); };
  await click(button('Copy link'));
  assert.equal($('.hb-share input').value, copied);
  assert.equal(document.activeElement, $('.hb-share input'));
});
test('native share cancellation does not falsely report a copied link', async (t) => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; } });
  t.after(() => delete navigator.share);
  await mount('/sites/hatra');
  await click(button('Share site'));
  assert.equal($('.hb-share [role="status"]').textContent, '');
});

test('viewer registration failures produce an actionable fallback', async () => {
  await act(async () => root.render(React.createElement(ModelViewer, { resource: verifiedResource, name: 'Fixture', registerViewer: () => Promise.reject(new Error('Module unavailable')) })));
  await click(button('Load 3D viewer'));
  assert.equal($('.hb-model').dataset.state, 'error');
  assert.ok(button('Retry viewer'));
  assert.ok($('.hb-model a[download]'));
});

test('all site records carry persisted slugs and resolve to their own deep links', () => {
  const raw = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
  assert.equal(new Set(raw.map((record) => record.slug)).size, raw.length);
  for (const record of raw) {
    assert.ok(record.slug);
    assert.equal(matchRoute(routes, `/sites/${record.slug}`).params.slug, record.slug);
  }
});

test('renderer errors evict only their own failed URL before a retry', async () => {
  const removed = [];
  const register = async () => ({ clearFailedModel: async (url) => { removed.push(url); } });
  await act(async () => root.render(React.createElement(ModelViewer, { resource: verifiedResource, name: 'Fixture', registerViewer: register })));
  await click(button('Load 3D viewer'));
  assert.equal($('model-viewer').getAttribute('src'), '/fixture.glb');
  await act(async () => $('model-viewer').dispatchEvent(new window.Event('error')));
  assert.deepEqual(removed, ['/fixture.glb']);
  await click(button('Retry viewer'));
  await act(async () => $('model-viewer').dispatchEvent(new window.Event('load')));
  assert.equal($('.hb-model').dataset.state, 'ready');
  assert.deepEqual(removed, ['/fixture.glb']);
});

test('a directly opened site section link scrolls to its existing target', async (t) => {
  const previous = window.HTMLElement.prototype.scrollIntoView;
  const targets = [];
  window.HTMLElement.prototype.scrollIntoView = function () { targets.push(this.id); };
  t.after(() => { window.HTMLElement.prototype.scrollIntoView = previous; });
  await mount('/sites/hatra#gallery');
  assert.ok(targets.includes('gallery'));
  assert.equal($('h1').textContent, 'Hatra');
});

test('disappeared heritage separates historical destruction from current restored condition and filters recover', async () => {
  sites.splice(0, sites.length, storytellingFixture(), storytellingFixture({ id: 'draft-story', name: 'Draft story', status: 'needs-review' }));
  await mount('/disappeared-heritage');
  assert.equal($('main h1').textContent, 'Disappeared Heritage');
  assert.equal(all('.hb-loss__entry').length, 1);
  assert.match($('.hb-loss__entry').textContent, /Restored/);
  assert.match($('.hb-loss__entry').textContent, /Synthetic loss/);
  assert.doesNotMatch($('.hb-loss__entry').textContent, /PRIVATE/);
  await search('no matching place');
  assert.match($('.hb-empty').textContent, /No heritage records match/);
  await click(button('Reset heritage filters'));
  assert.equal(all('.hb-loss__entry').length, 1);
  await click($('.hb-loss__entry a[href="/sites/story-fixture#preservation"]'));
  assert.equal(window.location.pathname, '/sites/story-fixture');
});

test('site stories and chronological events require claim review and appear in section navigation', async () => {
  sites.splice(0, sites.length, storytellingFixture());
  await mount('/sites/story-fixture');
  assert.match($('#preservation').textContent, /Synthetic restored condition/);
  assert.match($('#story-architecture').textContent, /Synthetic architecture narrative/);
  assert.equal($('#story-significance'), null);
  const events = all('.hb-site-events > li');
  assert.equal(events.length, 2);
  assert.match(events[0].textContent, /2015.*Synthetic loss/s);
  assert.match(events[1].textContent, /2020.*Synthetic restoration/s);
  assert.doesNotMatch($('main').textContent, /PRIVATE/);
  assert.ok($('.hb-sectionnav a[href="#story-architecture"]'));
  assert.ok($('.hb-sectionnav a[href="#timeline"]'));
  assert.ok($('#story-architecture a[href="https://whc.unesco.org/en/list/208/"]'));
});

function archiveFixture() {
  const id = 'archive-fixture';
  const claim = { siteId: id, verification_status: 'verified', reviewedBy: 'Fixture reviewer', reviewedAt: '2026-11-01', sourceRefs: ['archive-source'] };
  return normalizeSites([{ id, name: 'Archive fixture', status: 'approved', governorate: 'Erbil', category: 'Building', period: 'Modern', description: 'Synthetic media fixture.',
    sources: [{ sourceName: 'Synthetic archive evidence', url: 'https://whc.unesco.org/en/list/208/', evidenceId: 'archive-source', accessedAt: '2026-11-01', accessLevel: 'full-text' }],
    heritage_media: [
      ...['photograph', 'archival-image', 'reconstruction', 'panorama'].map((type) => ({ ...approvedImage(`/${type}.svg`, id), ...claim, id: type, type, title: `Synthetic ${type}`, sourceUrl: 'https://example.org/license-evidence', description: 'Original test graphic, not a heritage photograph.', date: type === 'archival-image' ? 'c. 1920' : null })),
      { ...claim, id: 'video', type: 'video', title: 'Synthetic field video', url: '/synthetic-video.mp4' },
      { ...claim, id: 'model', type: '3d', title: 'Synthetic model', url: '/synthetic-model.glb', date: '2020', description: 'Synthetic model documentation.' },
      { ...approvedImage('/draft.svg', id), ...claim, id: 'draft', type: 'archival-image', title: 'PRIVATE DRAFT', verification_status: 'draft' },
    ] }])[0];
}

test('typed gallery identifies archival images, reconstructions, panoramas, videos and models without eager viewers', async () => {
  sites.splice(0, sites.length, archiveFixture());
  await mount('/sites/archive-fixture');
  assert.equal(all('#gallery .hb-gallery img').length, 4);
  assert.match($('#gallery').textContent, /Archival photograph/);
  assert.match($('#gallery').textContent, /Reconstruction render/);
  assert.match($('#gallery').textContent, /Panorama/);
  assert.match($('#gallery').textContent, /c\. 1920/);
  assert.doesNotMatch($('#gallery').textContent, /PRIVATE DRAFT/);
  assert.equal($('#gallery iframe, #gallery video, #gallery model-viewer'), null);
  await click($('#gallery [data-media-type="3d"]'));
  assert.match($('#gallery').textContent, /Synthetic model documentation/);
  assert.match($('#gallery').textContent, /2020/);
  assert.ok($('#gallery .hb-claim__evidence'));
  await click($('#gallery [data-media-type="archival-image"]'));
  assert.equal(all('#gallery .hb-gallery img').length, 1);
  await click($('#gallery .hb-gallery__item'));
  assert.match($('.hb-lightbox figcaption').textContent, /c\. 1920/);
  await click(button('Close'));
  await click($('#gallery [data-media-type="video"]'));
  assert.equal($('#gallery video'), null);
  await click(button('Load video'));
  assert.equal($('#gallery video').getAttribute('src'), '/synthetic-video.mp4');
});

test('archival image collection searches metadata and links each image to its site', async () => {
  sites.splice(0, sites.length, archiveFixture());
  await mount('/image-archive');
  assert.equal($('main h1').textContent, 'Historical Image Archive');
  assert.equal(all('.hb-archive .hb-gallery > li').length, 1);
  assert.ok($('.hb-archive a[href="/sites/archive-fixture#gallery"]'));
  assert.match($('.hb-archive').textContent, /c\. 1920/);
  await search('nothing matches');
  assert.match($('.hb-empty').textContent, /No archival images match/);
  await click(button('Reset image search'));
  assert.equal(all('.hb-archive .hb-gallery > li').length, 1);
});

test('known restricted typed-image observations also block a matching legacy cover and gallery', async () => {
  const id = 'shared-media';
  const [record] = normalizeSites([{ id, name: 'Shared media', status: 'approved',
    coverImage: approvedImage('/shared.svg', id), galleryImages: [approvedImage('/shared.svg', id)],
    heritage_media: [{ id: 'negative', type: 'archival-image', src: '/shared.svg', siteId: id,
      verification_status: 'draft', source_observations: [{ license_status: 'restricted' }] }] }]);
  assert.equal(record.coverImage, null);
  assert.deepEqual(record.images, []);
  assert.deepEqual(record.heritageMedia, []);
});

test('SEO metadata follows client navigation without duplicate or stale site tags', async () => {
  await mount('/sites/hatra');
  const siteDescription = $('head meta[name="description"]').content;
  assert.match(document.title, /Hatra/);
  assert.equal($('head meta[property="og:title"]').content, document.title);
  assert.equal($('head meta[property="og:locale"]').content, 'en_US');
  assert.ok(siteDescription.length > 20);
  await navigate('/about');
  assert.notEqual($('head meta[name="description"]').content, siteDescription);
  assert.match($('head meta[property="og:title"]').content, /About/);
  await navigate('/sites/does-not-exist');
  assert.match($('head meta[name="robots"]').content, /noindex/);
  assert.equal($('head link[rel="canonical"]'), null);
  assert.equal($('head meta[property="og:url"]'), null);
  assert.doesNotMatch($('head meta[property="og:title"]').content, /Hatra/);
  for (const selector of ['head title', 'head meta[name="description"]', 'head meta[name="robots"]', 'head meta[property="og:title"]']) {
    assert.equal(all(selector).length, 1, selector);
  }
  await navigate('/');
  assert.equal(document.title, 'History in Cards');
  assert.equal($('head meta[property="og:title"]').content, document.title);
  const language = async (value) => act(async () => {
    const select = $('.hb-lang__select');
    select.value = value;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  try {
    await language('de');
    assert.equal($('head meta[property="og:locale"]').content, 'de_DE');
    assert.equal($('head meta[property="og:title"]').content, document.title);
  } finally {
    await language('en');
  }
  assert.equal($('head meta[property="og:locale"]').content, 'en_US');
});
