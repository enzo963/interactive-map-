// Arabic for the map-first panels: text written as English in components resolves through ar-text.js,
// counts use Arabic plural forms, and keyed strings from ar.js keep working.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const i18n = await server.ssrLoadModule('/src/i18n/index.js');
after(async () => { i18n.setCurrentLanguage('en'); await server.close(); });

test('panel text and governorate names are Arabic in the Arabic interface', () => {
  i18n.setCurrentLanguage('ar');
  assert.equal(i18n.t('All of Iraq'), 'كل العراق');
  assert.equal(i18n.t('Choose a governorate'), 'اختر محافظة');
  assert.equal(i18n.t('Nineveh'), 'نينوى');
  assert.equal(i18n.t('Open the {name} deck', { name: i18n.t('Erbil') }), 'افتح مجموعة أربيل');
  assert.equal(i18n.t('Discover history, one card at a time.'), 'اكتشف التاريخ، بطاقة بعد بطاقة.', 'keyed ar.js strings still resolve');
});

test('counts use Arabic plural forms', () => {
  i18n.setCurrentLanguage('ar');
  assert.equal(i18n.tn('{n} Card', '{n} Cards', 1), 'بطاقة واحدة');
  assert.equal(i18n.tn('{n} Card', '{n} Cards', 2), 'بطاقتان');
  assert.equal(i18n.tn('{n} Card', '{n} Cards', 5), '5 بطاقات');
  assert.equal(i18n.tn('{n} Card', '{n} Cards', 682), '682 بطاقة');
});

test('English and German are unaffected', () => {
  i18n.setCurrentLanguage('en');
  assert.equal(i18n.t('All of Iraq'), 'All of Iraq');
  assert.equal(i18n.tn('{n} Card', '{n} Cards', 682), '682 Cards');
  i18n.setCurrentLanguage('de');
  assert.equal(i18n.t('All of Iraq'), 'Ganzer Irak');
});
