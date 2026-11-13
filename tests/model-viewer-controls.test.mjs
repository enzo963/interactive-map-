import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element']) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const ModelViewer = (await server.ssrLoadModule('/src/components/site/ModelViewer.jsx')).default;
const resource = { url: '/fixture.glb', verified: true, siteId: 'fixture', title: 'Synthetic fixture', credit: 'Fixture author', sourceUrl: 'https://example.org/provenance', sourceName: 'Fixture catalogue' };
const $ = (s) => document.querySelector(s);
const button = (text) => { const node = [...document.querySelectorAll('button')].find((n) => n.textContent.trim() === text); assert.ok(node, `Missing button: ${text}`); return node; };
let root;
beforeEach(() => { root = createRoot($('#root')); });
afterEach(async () => { await act(async () => root.unmount()); });
after(async () => { await server.close(); dom.window.close(); });
const click = async (node) => act(async () => node.click());
const render = async (extra = {}) => act(async () => root.render(React.createElement(ModelViewer, { resource, name: 'Fixture', siteId: 'fixture', registerViewer: async () => ({}), ...extra })));
async function ready() {
  await render();
  await click(button('Load 3D viewer'));
  const node = $('model-viewer');
  let orbit = { theta: 1, phi: 1.2, radius: 4 };
  Object.assign(node, { getCameraOrbit: () => orbit, getCameraTarget: () => ({ x: 1, y: 2, z: 3 }), getFieldOfView: () => 30, jumpCameraToGoal() { orbit = { theta: 2, phi: 1, radius: 3 }; } });
  await act(async () => node.dispatchEvent(new window.Event('load')));
  return node;
}
test('progress rejects nonfinite values and clamps finite percentages', async () => {
  await render(); await click(button('Load 3D viewer'));
  for (const [value, expected] of [[.5, 50], [2, 100], [-1, 0], [NaN, 0], [Infinity, 0]]) {
    await act(async () => $('model-viewer').dispatchEvent(new window.CustomEvent('progress', { detail: { totalProgress: value } })));
    assert.equal($('progress').getAttribute('value'), String(expected));
  }
});
test('ready controls adjust real camera properties and reset orbit, target and field of view', async () => {
  const node = await ready();
  assert.ok($('[role="group"][aria-label="3D view controls"]'));
  await click(button('Rotate left')); assert.ok(Math.abs(parseFloat(node.cameraOrbit) - 0.7382006122) < 1e-9);
  await click(button('Rotate right')); assert.ok(Math.abs(parseFloat(node.cameraOrbit) - 2.2617993878) < 1e-9);
  await click(button('Rotate up')); assert.ok(Math.abs(parseFloat(node.cameraOrbit.split(' ')[1]) - 0.7382006122) < 1e-9);
  await click(button('Rotate down')); assert.ok(Math.abs(parseFloat(node.cameraOrbit.split(' ')[1]) - 1.2617993878) < 1e-9);
  await click(button('Zoom in')); assert.ok(Math.abs(parseFloat(node.cameraOrbit.split(' ')[2]) - 2.4) < 1e-10);
  await click(button('Zoom out')); assert.match(node.cameraOrbit, /3\.75m$/);
  node.cameraTarget = '9m 9m 9m'; node.fieldOfView = '90deg';
  await click(button('Reset view'));
  assert.equal(node.cameraOrbit, '1rad 1.2rad 4m');
  assert.equal(node.cameraTarget, '1m 2m 3m'); assert.equal(node.fieldOfView, '30deg');
});
test('unsupported fullscreen expands, Escape exits and restores focus', async () => {
  await ready(); const trigger = button('Enter fullscreen'); trigger.focus();
  await click(trigger); assert.ok($('.hb-model--expanded')); assert.equal(button('Exit fullscreen').getAttribute('aria-pressed'), 'true');
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal($('.hb-model--expanded'), null); assert.equal(document.activeElement, trigger);
});
test('native fullscreen follows browser exit and cleans up on resource replacement', async () => {
  await ready(); const panel = $('.hb-model'); let fullscreen = null; let exits = 0;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
  panel.requestFullscreen = async () => { fullscreen = panel; document.dispatchEvent(new window.Event('fullscreenchange')); };
  document.exitFullscreen = async () => { exits++; fullscreen = null; document.dispatchEvent(new window.Event('fullscreenchange')); };
  await click(button('Enter fullscreen')); assert.equal(button('Exit fullscreen').getAttribute('aria-pressed'), 'true');
  await render({ resource: { ...resource, url: '/replacement.glb' } });
  assert.equal(exits, 1); assert.equal($('[aria-label="3D view controls"]'), null);
  delete document.exitFullscreen; delete document.fullscreenElement;
});
test('provider, unsupported and unverified resources have no misleading local controls or eager registration', async () => {
  let registrations = 0; const registerViewer = async () => { registrations++; };
  for (const extra of [{}, { url: '/model.obj' }, { verified: false }, { siteId: 'other' }, { license_status: 'restricted' }]) {
    await render({ resource: { ...resource, ...extra }, registerViewer }); assert.equal($('[aria-label="3D view controls"]'), null); assert.equal($('model-viewer, iframe'), null);
  }
  await render({ resource: { ...resource, url: 'https://sketchfab.com/models/0123456789abcdef0123456789abcdef' }, registerViewer });
  await click(button('Load 3D viewer')); await act(async () => $('iframe').dispatchEvent(new window.Event('load')));
  assert.equal($('[aria-label="3D view controls"]'), null); assert.match($('#root').textContent, /Use the provider/); assert.equal(registrations, 0);
});
test('missing camera API disables camera actions without breaking download or attribution after failure', async () => {
  await render(); await click(button('Load 3D viewer'));
  await act(async () => $('model-viewer').dispatchEvent(new window.Event('load')));
  assert.equal(button('Reset view').disabled, true);
  await act(async () => $('model-viewer').dispatchEvent(new window.Event('error')));
  assert.ok($('a[download]')); assert.match($('#root').textContent, /Fixture author/); assert.ok($('a[href="https://example.org/provenance"]')); assert.equal($('[aria-label="3D view controls"]'), null);
});

test('model information never labels a provider as a file format', async () => {
  await render({ resource: { ...resource, url: 'https://sketchfab.com/models/0123456789abcdef0123456789abcdef' } });
  const fields = [...document.querySelectorAll('.hb-model__information dt')];
  assert.equal(fields.find((n) => n.textContent === 'Format').nextElementSibling.textContent, 'Not recorded');
  assert.equal(fields.find((n) => n.textContent === 'Provider').nextElementSibling.textContent, 'Sketchfab');
});
test('expanded view traps summary focus and releases scrolling on resource replacement', async () => {
  await ready(); await click(button('Enter fullscreen'));
  const summary = $('.hb-model__information summary');
  // Without a source link, the information summary is the final focusable control.
  await render({ resource: { ...resource, sourceUrl: '', sourceName: '' } });
  summary.focus();
  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
  assert.equal(document.activeElement.tagName, 'MODEL-VIEWER');
  await render({ resource: { ...resource, url: '/replacement.glb' } });
  assert.equal(document.body.style.overflow, '');
});
