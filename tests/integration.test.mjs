import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { after, afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'PopStateEvent', 'Element', 'SVGElement', 'getComputedStyle']) {
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
      license: 'Fixture permission', image_url: src, evidence: [{ evidenceId: 'fixture-license-evidence' }] },
    license_tracking: { evidence_valid: true, evidence_checks: [{ valid: true }], automatically_approved: false },
    publication_approval: { status: 'approved', siteId, site_verified: true, image_url: src,
      reviewedBy: 'Test editor', reviewedAt: '2026-11-01' } };
}
const fixtureSites = normalizeSites([
  { status: 'approved', verification_status: 'approved', id: 'fixture-erbil', slug: 'fixture-erbil', name: 'Erbil Fixture', governorate: 'Erbil', category: 'Citadel', period: 'Modern', description: 'Fixture description for integration tests.', coverImage: approvedImage('/fixture.jpg', 'fixture-erbil'), galleryImages: [], unesco: false, has3D: false, sources: [], estimated_year: 1900, latitude: 36.19, longitude: 44.01 },
  { status: 'approved', verification_status: 'approved', id: 'fixture-nineveh', slug: 'fixture-nineveh', name: 'Nineveh Fixture', governorate: 'Nineveh', category: 'Temple', period: 'Parthian', description: 'Fixture description for integration tests.', images: [{ src: '/fixture-one.jpg', alt: 'First fixture' }, { src: '/fixture-two.jpg', alt: 'Second fixture' }], unesco: true, has3D: true, model_3d_url: '/fixture.glb', sources: [{ sourceName: 'Fixture reference', url: 'https://example.org/reference', evidenceId: 'fixture-evidence', accessedAt: '2026-10-20' }], estimated_year: 1900, latitude: 35.8, longitude: 43.1 },
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

test('quality: missing geography drops the map section cleanly and invents no map link', async () => {
  sites[0].governorate = '';
  sites[0].latitude = null;
  sites[0].longitude = null;
  await mount('/sites/hatra');
  assert.equal($('#location'), null, 'no empty location section without verified coordinates');
  assert.ok(!all('.hb-sectionnav a').some((a) => a.getAttribute('href') === '#location'));
  assert.match($('main').textContent, /Governorate not recorded/);
  assert.equal($('main a[href="/decks/"]'), null);
  assert.equal($('#location a[href^="/map"]'), null);
});

test('every published card opens a useful Site Details page with no empty sections', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  assert.ok(sites.length > 600);
  await mount(`/sites/${sites[0].slug}`);
  for (const site of sites) {
    await navigate(`/sites/${site.slug}`);
    const label = site.slug;
    assert.equal($('h1').textContent, site.name, `${label}: name`);
    assert.ok(($('.hb-site__lede')?.textContent ?? '').trim().length >= 30, `${label}: description in the hero`);
    assert.ok($('.hb-site__card img, .hb-site__card .hb-card__placeholder'), `${label}: hero image or fallback`);
    const facts = $('.hb-site__metadata').textContent;
    assert.ok(facts.includes('Governorate') && facts.includes(site.governorate), `${label}: governorate`);
    assert.ok(facts.includes('Site type') && facts.includes(site.siteType), `${label}: category`);
    assert.equal(facts.includes('Period'), Boolean(site.period), `${label}: period shown only when known`);
    assert.doesNotMatch(facts, /\bsite-[a-z0-9-]+|needs-review/, `${label}: no raw codes in the facts`);
    assert.ok(all('.hb-facts__row dd').every((dd) => !/^(unknown|not-established|not-recorded)$/i.test(dd.textContent.trim())), `${label}: no "unknown" values`);
    assert.ok(all('#sources li').length >= 1, `${label}: sources`);
    assert.equal(all('main .hb-state[data-state="unavailable"]').length, 0, `${label}: no empty-state panels`);
    assert.equal(Boolean($('#location')), Number.isFinite(site.latitude) && Number.isFinite(site.longitude), `${label}: map only with coordinates`);
    assert.equal(Boolean($('#model')), site.modelResources.length > 0, `${label}: 3D only when present`);
    for (const section of all('main .hb-site__section')) {
      const title = section.querySelector('h2').textContent;
      assert.ok(section.textContent.trim().length > title.length + 20, `${label}: section ${section.id} has content`);
    }
  }
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
  for (const term of ['Tier 1', 'Tier 2', 'UNESCO', 'Wikimedia Commons', 'evidence', 'conflict', 'unknown', 'approval', 'license']) {
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

test('Home opens map first: the map and its control panel search, focus a governorate and lead on', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount();
  const section = $('main > .hb-mapfirst');
  assert.ok(section, 'the map section is the first thing in the page');
  assert.equal($('main').firstElementChild.tagName === 'STYLE' ? $('main').children[1] : $('main').firstElementChild, section);
  assert.ok(section.querySelector('.hb-mapfirst__map .hb-mapx__leaflet[data-size="fill"]'));
  assert.ok(section.querySelector('aside.hb-mapfirst__panel h1'));
  assert.match($('.hb-mapfirst__count').textContent, new RegExp(`${sites.length} Cards`));
  await act(async () => {
    const input = $('#mapfirst-search');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Hatra');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.match($('.hb-mapfirst__count').textContent, /card(s)? match/);
  const nineveh = all('.hb-mapfirst__region').find((b) => b.textContent.startsWith('Nineveh'));
  await click(nineveh);
  assert.equal(nineveh.getAttribute('aria-pressed'), 'true');
  assert.ok($('.hb-mapfirst__regions a[href="/decks/nineveh"]'), 'the selected governorate offers its deck');
  await act(async () => { $('.hb-mapfirst__search').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
  assert.equal(window.location.pathname, '/explore');
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'Hatra');
});

test('Map page uses the same map-first layout, with every control in the right panel', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/map?region=nineveh');
  const section = $('main.hb-map-page > .hb-mapfirst');
  assert.ok(section, 'the map section fills the page like the home page');
  assert.ok(section.querySelector('.hb-mapfirst__map .hb-mapx__leaflet[data-size="fill"]'));
  const panel = section.querySelector('aside.hb-mapfirst__panel');
  assert.equal(panel.querySelector('h1').textContent, 'Cards on the map');
  for (const selector of ['.hb-search', '.hb-mapx__filterbtn', '.hb-regions', '#map-result-heading', '.hb-mapx__list']) {
    assert.ok(panel.querySelector(selector), `panel holds ${selector}`);
  }
  assert.equal(panel.querySelector('.hb-region[aria-pressed="true"]').textContent.startsWith('Nineveh'), true);
});

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
  assert.match($('.hb-site__lede').textContent, /fortified city/);
  assert.ok($('#overview'), 'the historical background follows the description');
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
  await navigate('/explore'); assert.match($('.hb-empty').textContent, /No heritage sites yet/);
  await navigate('/3d-archive'); assert.match($('.hb-empty').textContent, /No verified 3D resources/);
});

test('Missing sites and decks render 404 content through the real router', async () => {
  await mount('/sites/not-a-site'); assert.match($('h1').textContent, /Card not found/);
  await navigate('/decks/not-a-deck'); assert.match($('h1').textContent, /Deck not found/);
});

test('Navigating between card pages injects no per-card styles (the card system lives in heritage-card.css)', async () => {
  await mount();
  await navigate('/explore');
  assert.ok(all('.hb-card').length > 0);
  await navigate('/decks/nineveh'); await navigate('/sites/hatra'); await navigate('/map');
  assert.equal(all('style[data-href^="hb-heritage-card"]').length, 0);
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
  sites.push(normalizeSites([{ id: 'imageless-site', name: 'Imageless test', slug: 'imageless-test', governorate: 'Erbil',
    description: 'A heritage record without any approved image.', coverImage: null, galleryImages: [], sources: [] }])[0]);
  await navigate('/sites/imageless-test');
  assert.equal($('#gallery'), null, 'no empty gallery section');
  assert.ok($('.hb-site__card .hb-card__placeholder'), 'the card shows the Heritage Bridge fallback image');
  assert.match($('.hb-site__lede').textContent, /without any approved image/);
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
  // The exact alias ranks first; spelling-tolerant matches (Al-Khulafa, "Al-Qasr Mosque") may follow.
  assert.ok(all('.hb-grid > li').length >= 1);
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
  // 9 of the 34 approved sites carry classified 3D documentation (src/data/digital-documentation.json).
  await navigate('/explore?model=unknown');
  assert.equal(all('.hb-grid > li').length, 24);
  await click(button('Show 1 more'));
  assert.equal(all('.hb-grid > li').length, 25);
  await navigate('/explore?model=yes');
  assert.equal(all('.hb-grid > li').length, 9);
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
  assert.equal(all('.hb-mapx__list li').length, 1);
  await click(all('.hb-regionpanel a').find((a) => a.textContent === 'Browse Nineveh heritage'));
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'mosque');
  assert.equal(new URLSearchParams(window.location.search).get('gov'), 'nineveh');
  assert.equal($('h1').textContent, 'Nineveh heritage');
  assert.match($('.hb-pagehead').textContent, /7 heritage sites/);
  assert.equal(all('.hb-grid > li').length, 1);
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
test('3D collection lists approved sites with classified 3D documentation', async () => {
  sites.splice(0, sites.length, ...structuredClone(importedSites));
  await mount('/3d-archive');
  const titles = all('.hb-grid .hb-card__title').map((title) => title.textContent);
  assert.equal(titles.length, 9);
  assert.ok(titles.includes('Hatra') && titles.includes('Al-Nouri Mosque and al-Hadba Minaret'));
});

test('3D collection has an honest empty state and accepts only verified resources', async () => {
  // Without the classified documentation the archive has no verified resource.
  sites.splice(0, sites.length, ...structuredClone(importedSites).map((site) => ({
    ...site, modelResources: site.modelResources.filter((resource) => !resource.documentation), hasModel: false, has3D: null })));
  await mount('/3d-archive');
  assert.match($('.hb-empty').textContent, /No verified 3D resources/);
  assert.equal($('model-viewer, iframe'), null);
  sites.push(...normalizeSites([{ id: 'verified-model', name: 'Verified fixture', status: 'approved', has3D: true, model_3d_url: '/fixture.glb' }]));
  await navigate('/explore'); await navigate('/decks/3d');
  assert.equal(all('.hb-grid > li').length, 1);
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
test('copy-link uses the canonical route and offers manual selection on clipboard failure', async (t) => {
  let copied;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (url) => { copied = url; } } });
  t.after(() => delete navigator.clipboard);
  await mount('/sites/hatra?source=search#gallery');
  await click(button('Copy link'));
  assert.equal(copied, 'http://localhost/sites/hatra');
  assert.equal($('link[rel="canonical"]').getAttribute('href'), copied);
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
