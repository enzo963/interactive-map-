// Lists interface text that has no German translation yet.
//   node scripts/check-i18n.mjs          -> report
//   node scripts/check-i18n.mjs --json   -> missing keys as JSON (to paste into src/i18n/messages/de.js)
// Keys are the English texts passed to t()/tn(), plus the label/title/blurb texts of the data modules
// listed below, which components translate when they render them.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import de from '../src/i18n/messages/de.js';

const require = createRequire(import.meta.url);
const espree = require('espree');
const ROOT = new URL('../src/', import.meta.url).pathname;
const DATA_FILES = new Set([
  'data/navigation.js', 'data/collections.js', 'data/specialDecks.js', 'data/drawFilters.js', 'data/cardTypeNotes.js',
  'utils/heritageCategories.js', 'utils/filterSites.js', 'utils/related.js', 'utils/documentation.js', 'utils/modelResources.js',
  'components/home/AboutArchive.jsx', 'components/home/ArchiveStats.jsx', 'pages/About.jsx', 'pages/Methodology.jsx', 'pages/OurWork.jsx',
]);
const DATA_PROPS = new Set(['label', 'title', 'shortTitle', 'blurb', 'description', 'rankLabel']);
const prose = (s) => /[A-Za-z]{2}/.test(s) && (/\s/.test(s) || /^[A-Z]/.test(s)) && !/^(https?:|\/|#|\.|[a-z-]+$)/.test(s);

const files = [];
const walk = (dir) => readdirSync(dir).forEach((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) { if (name !== 'i18n' && name !== 'lib') walk(path); } else if (/\.(jsx?|mjs)$/.test(name)) files.push(path);
});
walk(ROOT);

const keys = new Map(); // key -> first file
const add = (key, file) => { if (!keys.has(key)) keys.set(key, file.replace(ROOT, '')); };
for (const file of files) {
  const rel = file.replace(ROOT, '');
  const ast = espree.parse(readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
  const visit = (node, parentKey) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && ['t', 'tr', 'tn', 'useDocumentTitle'].includes(node.callee.name)) {
      const [a, b] = node.arguments;
      if (node.callee.name === 'tn' && a?.type === 'Literal' && b?.type === 'Literal') add(`${a.value}|${b.value}`, file);
      else if (a?.type === 'Literal' && typeof a.value === 'string') add(a.value, file);
    }
    if (DATA_FILES.has(rel) && node.type === 'Literal' && typeof node.value === 'string' && prose(node.value)
        && (parentKey === 'array' || DATA_PROPS.has(parentKey))) add(node.value, file);
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (Array.isArray(value)) value.forEach((child) => visit(child, node.type === 'ArrayExpression' ? 'array' : key));
      else if (value && typeof value.type === 'string') visit(value, node.type === 'Property' ? node.key?.name ?? node.key?.value : key);
    }
  };
  visit(ast);
}
// Derived labels built from the data (card types, governorates, categories) are listed in de.js directly.
const missing = [...keys].filter(([key]) => !(key in de));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(Object.fromEntries(missing.map(([key]) => [key, ''])), null, 2));
} else {
  missing.forEach(([key, file]) => console.log(`${file}\t${key}`));
  console.log(`\n${keys.size} keys, ${missing.length} without a German translation.`);
  process.exitCode = missing.length ? 1 : 0;
}
