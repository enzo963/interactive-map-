// The heritage card visual system: every card renders the same slots in the same order, so the
// image window keeps one proportion across a grid, and no tier ornament changes the layout.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const HeritageCard = (await server.ssrLoadModule('/src/components/cards/HeritageCard.jsx')).default;
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { RouterContext } = await server.ssrLoadModule('/src/router/RouterContext.js');
after(async () => { await server.close(); });

const css = readFileSync(new URL('../src/styles/heritage-card.css', import.meta.url), 'utf8');
const sites = await getAllSites();
const router = { location: { pathname: '/', search: '', hash: '' }, navigate: () => {} };
const render = (site, props = {}) => renderToStaticMarkup(
  React.createElement(RouterContext.Provider, { value: router }, React.createElement(HeritageCard, { site, ...props })));
const count = (html, cls) => (html.match(new RegExp(`class="[^"]*\\b${cls}\\b`, 'g')) || []).length;

// The fixed rows of a card, in order; the image window is the only flexible one.
const SLOTS = ['hb-card__top', 'hb-card__code', 'hb-card__type-name', 'hb-card__rank', 'hb-card__media', 'hb-card__title',
  'hb-card__category', 'hb-card__place', 'hb-card__period', 'hb-card__foot', 'hb-card__date', 'hb-card__brand'];

test('every visible card renders each slot once, in the same order', () => {
  assert.ok(sites.length > 600);
  for (const site of sites) {
    const html = render(site, { showCta: true });
    for (const slot of SLOTS) assert.equal(count(html, slot), 1, `${site.id}: ${slot}`);
    const order = SLOTS.map((slot) => html.search(new RegExp(`class="[^"]*\\b${slot}\\b`)));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${site.id}: slot order`);
    assert.ok(!html.includes('<style'), `${site.id}: card styles belong in heritage-card.css`);
  }
});

test('missing values keep their slot: period, rank and image', () => {
  const plain = sites.find((site) => !site.period && !site.cardType.rankLabel && !site.coverImage);
  assert.ok(plain, 'fixture: a card without period, rank or image');
  const html = render(plain);
  assert.match(html, /hb-card__period hb-card__period--missing">Period not recorded</);
  assert.match(html, /class="hb-card__rank"><\/span>/);
  assert.match(html, /class="hb-card__placeholder" role="img" aria-label="No verified photograph of /);
});

test('long names stay whole for assistive technology and in the tooltip', () => {
  const longest = [...sites].sort((a, b) => b.name.length - a.name.length)[0];
  const html = render(longest);
  const name = longest.name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  assert.ok(html.includes(`title="${name}"`), 'full name in the link title');
  assert.ok(html.includes(`>${name}</a>`), 'full name as the link text');
});

const rule = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `missing rule ${selector}`);
  return css.slice(at, css.indexOf('}', at));
};

test('the title always takes two lines and single-line slots never wrap', () => {
  const title = rule('.hb-card__title');
  assert.match(title, /height: 2\.24em/);
  assert.match(title, /line-height: 1\.12/);
  assert.match(title, /-webkit-line-clamp: 2/);
  const single = css.slice(css.indexOf('.hb-card__label,\n.hb-card__code'), css.indexOf('/* header'));
  for (const slot of ['label', 'code', 'type-name', 'rank', 'category', 'place', 'period', 'date', 'brand']) {
    assert.ok(single.includes(`.hb-card__${slot}`), `${slot} is a single-line slot`);
  }
  assert.match(single, /white-space: nowrap/);
  assert.match(single, /text-overflow: ellipsis/);
});

test('tier ornaments never change the size of a row', () => {
  const tierRules = [...css.matchAll(/((?:\.hb-card\[data-tier='\d'\][^{,]*,?\s*)+)\{([^}]*)\}/g)];
  assert.ok(tierRules.length >= 6);
  for (const [, selector, body] of tierRules) {
    if (/::before\s*$/.test(selector.trim()) && /position: absolute/.test(body)) continue; // overlays
    assert.doesNotMatch(body, /(^|[\s;])(height|min-height|margin[\w-]*|padding[\w-]*|border-width|font-size|line-height|display)\s*:/,
      `${selector.trim()} changes layout`);
  }
});
