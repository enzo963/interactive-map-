import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { afterEach, test } from 'node:test';
import { setCurrentLanguage, t, tn, tDate } from '../src/i18n/index.js';
import { detectLanguage } from '../src/i18n/detectLanguage.js';

const realDateTimeFormat = Intl.DateTimeFormat;
function visitor({ timeZone, languages = ['en-US'], stored = null }) {
  Intl.DateTimeFormat = function () { return { resolvedOptions: () => ({ timeZone }) }; };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages, language: languages[0] } });
  globalThis.window = { localStorage: { getItem: () => stored, setItem() {} } };
}
afterEach(() => {
  Intl.DateTimeFormat = realDateTimeFormat;
  delete globalThis.window;
  setCurrentLanguage('en');
});

test('German for visitors in Germany, Austria and Liechtenstein; English elsewhere', () => {
  for (const timeZone of ['Europe/Berlin', 'Europe/Vienna', 'Europe/Vaduz']) {
    visitor({ timeZone });
    assert.equal(detectLanguage(), 'de', timeZone);
  }
  for (const timeZone of ['Asia/Baghdad', 'America/New_York', 'Europe/London']) {
    visitor({ timeZone, languages: ['ar-IQ'] });
    assert.equal(detectLanguage(), 'en', timeZone);
  }
});

test('multilingual regions get German only when the browser prefers it', () => {
  visitor({ timeZone: 'Europe/Zurich', languages: ['de-CH'] });
  assert.equal(detectLanguage(), 'de');
  visitor({ timeZone: 'Europe/Zurich', languages: ['fr-CH'] });
  assert.equal(detectLanguage(), 'en');
});

test('a language chosen by the visitor wins over the region', () => {
  visitor({ timeZone: 'Europe/Berlin', stored: 'en' });
  assert.equal(detectLanguage(), 'en');
});

test('English is the key; German comes from the catalog, with English fallback', () => {
  assert.equal(t('Explore Cards'), 'Explore Cards');
  setCurrentLanguage('de');
  assert.equal(t('Explore Cards'), 'Karten entdecken');
  assert.equal(t('Showing {shown} of {total}', { shown: 3, total: 9 }), '3 von 9 angezeigt');
  assert.equal(t('A text nobody translated'), 'A text nobody translated');
  assert.equal(tn('{n} Card', '{n} Cards', 1), '1 Karte');
  assert.equal(tn('{n} Card', '{n} Cards', 4), '4 Karten');
  assert.equal(tDate('c. 100 BCE'), 'ca. 100 v. Chr.');
});

test('every interface text has a German translation', () => {
  execFileSync(process.execPath, ['scripts/check-i18n.mjs'], { stdio: 'pipe' });
});
