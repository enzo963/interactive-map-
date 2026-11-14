import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
test('suggestions come from local visible fields, require two characters, deduplicate and bound the limit', async () => {
  const module = await server.ssrLoadModule('/src/utils/searchSuggestions.js').catch(() => ({}));
  assert.equal(typeof module.getSearchSuggestions, 'function');
  const { getSearchSuggestions } = module;
  const sites = [{ name: 'Café', aliases: ['CAFE', 'Cafe old'], governorate: 'Cafe province', civilization: 'Cafe era', siteType: 'Cafe monument' }];
  assert.deepEqual(getSearchSuggestions(sites, 'c'), []);
  assert.deepEqual(getSearchSuggestions(sites, 'ca').map(({ value }) => value), ['Café', 'Cafe old', 'Cafe province', 'Cafe era', 'Cafe monument']);
  assert.deepEqual(getSearchSuggestions(sites, 'ca').map(({ type }) => type), ['name', 'alias', 'governorate', 'civilization', 'category']);
  assert.equal(getSearchSuggestions(sites, 'ca', { limit: 2 }).length, 2);
  assert.equal(getSearchSuggestions(Array.from({ length: 20 }, (_, i) => ({ name: `Castle ${i}` })), 'ca', { limit: 99 }).length, 8);
});

test('combobox supports keyboard, dismissal, pointer selection and controlled updates without losing focus', async () => {
  const module = await server.ssrLoadModule('/src/components/common/SearchAutocomplete.jsx').catch(() => ({}));
  assert.equal(typeof module.default, 'function');
  const SearchAutocomplete = module.default;
  const sites = [{ name: 'Hatra', aliases: ['Hatran city'] }, { name: 'Hatra Temple' }];
  let update;
  const selected = [];
  function Harness() {
    const [value, setValue] = React.useState('Ha');
    update = setValue;
    return React.createElement(SearchAutocomplete, { id: 'fixture-search', name: 'q', value, sites,
      onChange: (next) => { selected.push(next); setValue(next); } });
  }
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Harness)));
  const input = document.querySelector('input');
  await act(async () => input.focus());
  assert.equal(input.getAttribute('role'), 'combobox');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.ok(document.getElementById(input.getAttribute('aria-controls')));
  const key = async (name) => {
    const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    await act(async () => input.dispatchEvent(event));
    return event;
  };
  await key('ArrowDown');
  assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).textContent.includes('Hatra'), true);
  assert.equal((await key('Enter')).defaultPrevented, true);
  assert.equal(selected.at(-1), 'Hatra');
  assert.equal(document.activeElement, input);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  await act(async () => { input.blur(); input.focus(); });
  await key('Escape');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  await key('ArrowDown');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  await act(async () => root.render(React.createElement(Harness)));
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Hat');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(selected.at(-1), 'Hat');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.equal((await key('Enter')).defaultPrevented, false);
  await key('Escape');
  await act(async () => { input.blur(); input.focus(); });
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  await key('ArrowUp');
  assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).textContent.includes('Temple'), true);
  const option = document.querySelector('[role="option"]');
  const pointerDown = new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true });
  await act(async () => option.dispatchEvent(pointerDown));
  assert.equal(pointerDown.defaultPrevented, true);
  const down = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
  await act(async () => { option.dispatchEvent(down); option.click(); });
  assert.equal(down.defaultPrevented, true);
  assert.equal(document.activeElement, input);
  await act(async () => update('Temple'));
  assert.equal(document.activeElement, input);
  await act(async () => input.blur());
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  await act(async () => root.unmount());
});

test('touch selection works without relying on a synthesized mouse click', async () => {
  const SearchAutocomplete = (await server.ssrLoadModule('/src/components/common/SearchAutocomplete.jsx')).default;
  const selections = [];
  function Harness() {
    const [value, setValue] = React.useState('Ha');
    return React.createElement(SearchAutocomplete, { value, sites: [{ name: 'Hatra' }], onChange: (next) => { selections.push(next); setValue(next); } });
  }
  const root = createRoot(document.getElementById('root'));
  try {
    await act(async () => root.render(React.createElement(Harness)));
    const input = document.querySelector('input');
    await act(async () => input.focus());
    const option = document.querySelector('[role="option"]');
    for (const type of ['pointerdown', 'pointerup']) {
      const event = new window.MouseEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      await act(async () => option.dispatchEvent(event));
    }
    assert.deepEqual(selections, ['Hatra']);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, input);
  } finally { await act(async () => root.unmount()); }
});

test('SearchField uses the shared combobox by default', async () => {
  const SearchField = (await server.ssrLoadModule('/src/components/common/SearchField.jsx')).default;
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(SearchField, { value: '', onChange: () => {} })));
  assert.equal(document.querySelector('input').getAttribute('role'), 'combobox');
  await act(async () => root.unmount());
});

test('SearchField preserves its label, string callback, clear focus, and suggestion opt-out', async () => {
  const SearchField = (await server.ssrLoadModule('/src/components/common/SearchField.jsx')).default;
  let current = 'Ha';
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(SearchField, { value: current, onChange: (value) => { current = value; }, label: 'Find record', suggestions: false })));
  const input = document.querySelector('input');
  assert.equal(document.querySelector('label').htmlFor, input.id);
  assert.equal(input.getAttribute('role'), null);
  await act(async () => document.querySelector('.hb-search__clear').click());
  assert.equal(current, '');
  assert.equal(document.activeElement, input);
  await act(async () => root.unmount());
});
