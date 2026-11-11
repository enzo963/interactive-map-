/**
 * Daily coverage report for the nine governorates (definitions in src/utils/coverage.js).
 *   npm run report:coverage              print the table, update reports/coverage/
 *   npm run report:coverage -- --no-write   print only
 *
 * Writes reports/coverage/latest.md (the table, the lagging governorate and what would close its
 * largest gaps) and reports/coverage/history.json (one snapshot per day, so each run shows the
 * change since the previous day it was run).
 */
import { mkdirSync, readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { createServer } from 'vite';

const root = new URL('../', import.meta.url);
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' });
const { coverageByGovernorate, COVERAGE_RATES } = await server.ssrLoadModule('/src/utils/coverage.js');
await server.close();

const records = JSON.parse(readFileSync(new URL('src/data/sites.json', root), 'utf8'));
// Discovery batches, one folder per governorate run; sync copies ("… 2.json") are ignored.
const discoveryDir = new URL('tools/content-pipeline/data/discovery/', root);
const discovered = readdirSync(discoveryDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  .flatMap((entry) => readdirSync(new URL(`${entry.name}/`, discoveryDir))
    .filter((name) => /^[a-z-]+-records\.json$/.test(name))
    .flatMap((name) => JSON.parse(readFileSync(new URL(`${entry.name}/${name}`, discoveryDir), 'utf8'))));

const { rows, totals, lagging, lowest } = coverageByGovernorate(records, discovered);
const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const reportDir = new URL('reports/coverage/', root);
const historyFile = new URL('history.json', reportDir);
const history = existsSync(historyFile) ? JSON.parse(readFileSync(historyFile, 'utf8')) : {};
const previousDate = Object.keys(history).filter((date) => date < today).sort().at(-1);
const previous = previousDate ? history[previousDate] : null;

const COUNTS = [
  ['discovered', 'Discovered'], ['approved', 'Approved'], ['published', 'Published'], ['image', 'Primary image'],
  ['gallery', 'Gallery'], ['coordinates', 'Coordinates'], ['multiSource', 'Multiple sources'], ['review', 'Needs review'],
];
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '–');
const delta = (row, key) => {
  const before = previous?.[row.key]?.[key];
  if (before === undefined || before === row[key]) return '';
  return ` (${row[key] > before ? '+' : ''}${row[key] - before})`;
};
const cell = (row, key) => {
  const rate = ['image', 'gallery', 'coordinates', 'multiSource', 'approved'].includes(key) ? ` · ${pct(row[key], row.published)}` : '';
  const weakest = lowest[key]?.includes(row.key) ? ' ▼' : '';
  return `${row[key]}${rate}${delta(row, key)}${weakest}`;
};

// What would bring the lagging governorate up to the median governorate on each measure.
const median = (values) => { const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const laggingRow = rows.find((row) => row.key === lagging);
const gaps = COVERAGE_RATES.map(([key, label]) => {
  const target = median(rows.map((row) => row.rates[key]));
  const needed = Math.max(0, Math.ceil(target * laggingRow.published) - laggingRow[key]);
  return { key, label, target, needed };
}).filter((gap) => gap.needed > 0).sort((a, b) => b.needed - a.needed);

const ordered = [...rows].sort((a, b) => a.rank - b.rank);
const header = ['Rank', 'Governorate', 'Score', ...COUNTS.map(([, label]) => label)];
const lines = ordered.map((row) => [String(row.rank), row.name, pct(row.score, 1), ...COUNTS.map(([key]) => cell(row, key))]);
const totalLine = ['', 'All nine', '', ...COUNTS.map(([key]) => String(totals[key]))];

const markdown = [
  `# Governorate coverage — ${today}`,
  '',
  `**Lagging: ${laggingRow.name}** — ranked last on the mean of its approved, primary-image, gallery, coordinate and multiple-source shares of published cards (${pct(laggingRow.score, 1)}).`,
  previousDate ? `Changes in brackets are since ${previousDate}.` : 'No earlier snapshot yet; changes appear from the next day the report is run.',
  '',
  `| ${header.join(' | ')} |`,
  `| ${header.map((_, i) => (i < 2 ? '---' : '---:')).join(' | ')} |`,
  ...lines.map((line) => `| ${line.join(' | ')} |`),
  `| ${totalLine.join(' | ')} |`,
  '',
  'Percentages are shares of the governorate’s published cards; ▼ marks the weakest governorate on that measure.',
  '',
  `## To bring ${laggingRow.name} to the median governorate`,
  '',
  ...(gaps.length ? gaps.map((gap) => `- ${gap.label}: ${gap.needed} more card${gap.needed === 1 ? '' : 's'} (median ${pct(gap.target, 1)})`) : ['- Already at or above the median on every measure.']),
  '',
  '## Weakest governorate per measure',
  '',
  ...COVERAGE_RATES.map(([key, label]) => `- ${label}: ${rows.filter((item) => lowest[key].includes(item.key))
    .map((row) => `${row.name} (${row[key]} of ${row.published}, ${pct(row[key], row.published)})`).join('; ')}`),
  '',
  '## Definitions',
  '',
  '- Discovered: distinct records found for the governorate in the discovery batches and the archive, before duplicates are merged.',
  '- Approved: status `approved`. Needs review: status `needs-review` or `draft`.',
  '- Published: visible cards (card contract met). Primary image: an approved cover. Gallery: at least one approved gallery image.',
  '- Coordinates: verified latitude and longitude. Multiple sources: two or more distinct credible publishers (tiers 1–3).',
  '',
].join('\n');

// Terminal: the same table, aligned.
const widths = header.map((_, i) => Math.max(...[header, ...lines, totalLine].map((line) => line[i].length)));
const fmt = (line) => line.map((value, i) => (i < 2 ? value.padEnd(widths[i]) : value.padStart(widths[i]))).join('  ');
console.log(`Governorate coverage — ${today}${previousDate ? ` (changes since ${previousDate})` : ''}\n`);
console.log(fmt(header));
console.log(widths.map((w) => '─'.repeat(w)).join('  '));
lines.forEach((line) => console.log(fmt(line)));
console.log(fmt(totalLine));
console.log(`\nLagging: ${laggingRow.name} (${pct(laggingRow.score, 1)}). ${gaps.slice(0, 3).map((gap) => `${gap.label} +${gap.needed}`).join(', ')}`);

if (!process.argv.includes('--no-write')) {
  mkdirSync(reportDir, { recursive: true });
  history[today] = Object.fromEntries(rows.map((row) => [row.key, Object.fromEntries(COUNTS.map(([key]) => [key, row[key]]))]));
  writeFileSync(historyFile, `${JSON.stringify(history, null, 2)}\n`);
  writeFileSync(new URL('latest.md', reportDir), markdown);
  console.log('\nWrote reports/coverage/latest.md and history.json');
}
