import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element']) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const Comparison = (await server.ssrLoadModule('/src/components/site/BeforeAfterComparison.jsx')).default;
const records = JSON.parse(await readFile(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const photos = records.filter((s) => s.status === 'approved').flatMap((s) => [s.coverImage, ...s.galleryImages].filter(Boolean)).slice(0, 2);
const images = photos.map((p) => ({ ...structuredClone(p), siteId: 'fixture', publication_approval: { status: 'approved', siteId: 'fixture', site_verified: true, image_url: p.src, reviewedBy: 'Test reviewer', reviewedAt: '2026-11-01' } }));
const pair = { id: 'pair', title: 'Reviewed pair', type: 'reconstruction', siteId: 'fixture', verified: true, before: { image: images[0], label: 'Archive view', date: 'c. 1930', kind: 'photograph' }, after: { image: images[1], label: 'Reconstructed view', date: '2024', kind: 'reconstruction' }, notes: 'Reviewed notes.' };
const $ = (selector) => document.querySelector(selector);
let root;
beforeEach(() => { root = createRoot($('#root')); });
afterEach(async () => { await act(async () => root.unmount()); });
after(async () => { await server.close(); dom.window.close(); });
const render = async (comparison = pair) => act(async () => root.render(React.createElement(Comparison, { comparison })));
const button = (label) => [...document.querySelectorAll('button')].find((node) => node.textContent === label);
test('native accessible slider, explicit dates, kinds, distinct alts and both credits', async () => {
  await render(); const range = $('input[type="range"]');
  assert.ok(range); assert.equal(range.min, '0'); assert.equal(range.max, '100'); assert.equal(range.value, '50');
  assert.ok(document.querySelector(`label[for="${range.id}"]`)); assert.equal(range.disabled, false);
  range.focus(); await act(async () => range.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  assert.equal(document.activeElement, range); // Native range supplies browser keyboard and touch semantics.
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(range, '75');
    range.dispatchEvent(new window.Event('input', { bubbles: true }));
    range.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.equal($('.hb-comparison__canvas').style.getPropertyValue('--comparison-position'), '75%');
  const imgs = [...document.querySelectorAll('img')]; assert.equal(imgs.length, 2); assert.notEqual(imgs[0].alt, imgs[1].alt);
  assert.ok(imgs.every((i) => i.getAttribute('loading') === 'lazy' && i.getAttribute('decoding') === 'async'));
  assert.match($('#root').textContent, /Photograph/); assert.match($('#root').textContent, /Reconstruction/); assert.match($('#root').textContent, /c\. 1930/);
  assert.equal(document.querySelectorAll('.hb-image-attribution').length, 2); assert.match($('#root').textContent, /perspectives.*alignment/i);
});
test('side-by-side mode removes the wipe and returns to comparison', async () => {
  await render(); await act(async () => button('Side by side').click());
  assert.equal($('input[type="range"]'), null); assert.ok($('.hb-comparison--side-by-side'));
  await act(async () => button('Wipe comparison').click()); assert.ok($('input[type="range"]'));
});
test('missing dates remain visibly unknown while reviewed images remain usable', async () => {
  const comparison = structuredClone(pair); delete comparison.before.date; comparison.after.date = '';
  await render(comparison); assert.ok($('input[type="range"]'));
  assert.match($('#root').textContent, /Date not recorded/);
});
test('failed image keeps attribution and meaningful fallback, removing unusable slider', async () => {
  await render(); await act(async () => $('img').dispatchEvent(new window.Event('error')));
  assert.equal($('input[type="range"]'), null); assert.match($('#root').textContent, /Image unavailable/);
  assert.equal(document.querySelectorAll('.hb-image-attribution').length, 2);
  await act(async () => $('img').dispatchEvent(new window.Event('error'))); assert.equal(document.querySelectorAll('img').length, 0);
  await render({ ...pair, before: { ...pair.before, image: images[1] }, after: { ...pair.after, image: images[0] } });
  assert.ok($('input[type="range"]')); assert.equal(document.querySelectorAll('img').length, 2);
});
test('unverified, unknown license, unsafe source or cross-site images render no comparison', async () => {
  for (const mutate of [(p) => { p.verified = false; }, (p) => { p.verification_status = 'draft'; p.verificationStatus = 'verified'; }, (p) => { p.before.image.license_status = 'unknown'; }, (p) => { p.before.image.src = 'javascript:alert(1)'; }, (p) => { p.after.image.siteId = 'other'; }]) {
    const changed = structuredClone(pair); mutate(changed); await render(changed); assert.equal($('#root').textContent, ''); assert.equal($('img'), null);
  }
});
