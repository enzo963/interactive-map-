/**
 * Checks the translations without a browser:  npm run check:i18n
 *  1. every language defines exactly the keys of English, with the same {placeholders}
 *  2. plural messages have the forms the language needs
 *  3. every key used in the code exists
 *  4. every vocabulary entry has Arabic and German
 *  5. region detection: Iraq -> ar, Germany -> de, anywhere else -> en, saved choice wins
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);

const { default: en } = await import('../src/i18n/messages/en.js');
const { default: ar } = await import('../src/i18n/messages/ar.js');
const { default: de } = await import('../src/i18n/messages/de.js');
const catalogs = { en, ar, de };

const placeholders = (message) => {
  const text = typeof message === 'object' ? Object.values(message).join(' ') : message;
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(',');
};

// 1 + 2 --------------------------------------------------------------------
const PLURAL_FORMS = { en: ['one', 'other'], de: ['one', 'other'], ar: ['zero', 'one', 'two', 'few', 'many', 'other'] };
for (const [code, catalog] of Object.entries(catalogs)) {
  for (const key of Object.keys(en)) {
    if (!(key in catalog)) fail(`[${code}] missing key: ${key}`);
  }
  for (const key of Object.keys(catalog)) {
    if (!(key in en)) fail(`[${code}] key not in English: ${key}`);
  }
  for (const [key, message] of Object.entries(catalog)) {
    if (!(key in en)) continue;
    if ((typeof message === 'object') !== (typeof en[key] === 'object')) fail(`[${code}] ${key}: plural/plain mismatch`);
    if (typeof message === 'object') {
      for (const form of PLURAL_FORMS[code]) if (!(form in message)) fail(`[${code}] ${key}: missing plural form "${form}"`);
    }
    if (code !== 'en' && placeholders(message) !== placeholders(en[key])) {
      fail(`[${code}] ${key}: placeholders {${placeholders(message)}} differ from English {${placeholders(en[key])}}`);
    }
    if (code !== 'en' && String(JSON.stringify(message)).trim() === '""') fail(`[${code}] ${key}: empty`);
  }
}

// 3 ------------------------------------------------------------------------
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const sources = walk(join(root, 'src')).filter((f) => /\.(jsx?|mjs)$/.test(f) && !f.includes('/messages/'));
const used = new Set();
for (const file of sources) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/\bt\(\s*'([\w.-]+)'/g)) used.add(m[1]);
}
const dynamic = [
  ...['explore', 'map', 'decks', 'archive3d', 'about'].map((id) => `nav.${id}`),
  ...['archive', 'name', 'oldest', 'newest', 'type'].map((id) => `sort.${id}`),
  ...['all', 'unesco', 'lost', '3d', 'our-work', 'ancient'].map((id) => `drawFilter.${id}`),
  ...['unesco', 'lost', 'our-work', '3d'].flatMap((id) => [`specialDeck.${id}.title`, `specialDeck.${id}.blurb`]),
  ...[1, 2, 3, 4, 5].map((n) => `cardNote.${n}`),
  ...['archive', 'type', 'image', 'name', 'place', 'date'].flatMap((k) => [`about.legend.${k}.term`, `about.legend.${k}.text`]),
];
dynamic.forEach((k) => used.add(k));
for (const key of used) if (!(key in en)) fail(`key used in code but not defined: ${key}`);

// 4 ------------------------------------------------------------------------
const vocab = await import('../src/i18n/vocabulary.js');
for (const [group, table] of Object.entries(vocab)) {
  for (const [name, entry] of Object.entries(table)) {
    for (const code of ['ar', 'de']) if (!entry[code]) fail(`vocabulary ${group}.${name}: no ${code}`);
  }
}
const { GOVERNORATE_CODES } = await import('../src/data/governorates.js');
for (const key of Object.keys(GOVERNORATE_CODES)) {
  if (!vocab.GOVERNORATES[key]) fail(`governorate "${key}" has no translation`);
}

// 5 ------------------------------------------------------------------------
const { detectLanguage } = await import('../src/i18n/detectLanguage.js');
const scenarios = [
  { name: 'Iraq (time zone)', tz: 'Asia/Baghdad', languages: ['en-US'], expect: 'ar' },
  { name: 'Germany (time zone)', tz: 'Europe/Berlin', languages: ['en-US'], expect: 'de' },
  { name: 'Iraq (browser region only)', tz: 'UTC', languages: ['en-IQ'], expect: 'ar' },
  { name: 'Germany (browser region only)', tz: 'UTC', languages: ['de-DE'], expect: 'de' },
  { name: 'United States', tz: 'America/New_York', languages: ['en-US'], expect: 'en' },
  { name: 'France', tz: 'Europe/Paris', languages: ['fr-FR'], expect: 'en' },
  { name: 'No region information', tz: 'UTC', languages: ['en'], expect: 'en' },
  { name: 'Saved choice beats region', tz: 'Asia/Baghdad', languages: ['en-US'], stored: 'de', expect: 'de' },
  { name: 'Invalid saved choice is ignored', tz: 'Europe/Berlin', languages: ['en-US'], stored: 'fr', expect: 'de' },
  { name: 'Storage blocked', tz: 'Asia/Baghdad', languages: ['en-US'], blocked: true, expect: 'ar' },
];
for (const s of scenarios) {
  process.env.TZ = s.tz;
  const store = s.stored ? { 'hb-lang': s.stored } : {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => {
        if (s.blocked) throw new Error('blocked');
        return store[k] ?? null;
      },
      setItem: () => {},
    },
  };
  Object.defineProperty(globalThis, 'navigator', { value: { languages: s.languages, language: s.languages[0] }, configurable: true });
  const got = detectLanguage();
  if (got !== s.expect) fail(`detection "${s.name}": expected ${s.expect}, got ${got}`);
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n` + failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`i18n OK: ${Object.keys(en).length} messages x 3 languages, ${used.size} keys used, ${scenarios.length} detection cases.`);
