/**
 * Field-completeness queue (rules in src/utils/fieldQueue.js).
 *   npm run report:fields                  print the summary, update reports/fields/
 *   npm run report:fields -- --no-write    print only
 *
 * Writes reports/fields/field-queue.md (what blocks publication, then the enrichment passes in work
 * order with the next batch of tasks) and reports/fields/field-queue.json (the full queue).
 * Exits 1 when an approved record has a blocking problem.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { createServer } from 'vite';

const root = new URL('../', import.meta.url);
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' });
const { buildFieldQueue, nextTasks } = await server.ssrLoadModule('/src/utils/fieldQueue.js');
await server.close();

const readJson = (path, fallback) => (existsSync(new URL(path, root)) ? JSON.parse(readFileSync(new URL(path, root), 'utf8')) : fallback);
const records = readJson('src/data/sites.json', []);
const decisions = readJson('tools/content-pipeline/data/fields/field-decisions.json', { decisions: {} }).decisions;
const imageState = readJson('tools/content-pipeline/data/images/image-queue-state.json', {});

const queue = buildFieldQueue(records, { decisions, imageState });
const { totals, blocking, passes, byGapCount } = queue;
const batch = nextTasks(queue, 25);
const today = new Date().toLocaleDateString('en-CA');
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '–');

const lines = [
  '# Field-completeness queue',
  '',
  `Generated ${today} by \`npm run report:fields\`. Rules: \`src/utils/fieldQueue.js\`. Full list: \`field-queue.json\`.`,
  '',
  `${totals.records} records · **${totals.published} published cards** (${totals.approved} approved, ${totals.awaitingReview} shown as awaiting review) · **${totals.blocked} blocked**.`,
  '',
  '## 1. Blocking — fix these first',
  '',
  'A record here is hidden from the site (it fails the card contract), or it shows an image without full attribution.',
  'These are the only gaps that keep a card from being published. Each must be fixed, not settled.',
  '',
];
if (blocking.length) {
  lines.push('| Record | Status | What blocks it |', '|---|---|---|');
  for (const item of blocking) lines.push(`| \`${item.id}\` ${item.name} | ${item.status} | ${item.problems.map((problem) => problem.label).join('; ')} |`);
} else lines.push('Nothing blocks publication.');

lines.push(
  '',
  '## 2. Enrichment — optional, worked in passes',
  '',
  'None of these hides a card. Work **one pass at a time across all cards** (highest-value cards first:',
  'approved, UNESCO, sites with component cards, strongest sources), within the time box. If the field',
  'cannot be filled from a credible source in that time, record it in',
  '`tools/content-pipeline/data/fields/field-decisions.json` as `not-found` and move to the next card.',
  'Do not start a second field on the same card until the pass is finished.',
  '',
  `| Pass | Field | Missing | Settled | Open | Share of cards complete | Time box | Why |`,
  '|---|---|---|---|---|---|---|---|',
);
for (const pass of passes) {
  const box = pass.timeboxMinutes ? `${pass.timeboxMinutes} min` : 'own queue';
  lines.push(`| ${pass.order} | ${pass.label} (\`${pass.field}\`) | ${pass.missing} | ${pass.settled} | ${pass.open} | ${pct(totals.published - pass.missing, totals.published)} | ${box} | ${pass.why} |`);
}
lines.push(
  '',
  `Open enrichment gaps per card: ${Object.entries(byGapCount).sort((a, b) => a[0] - b[0]).map(([n, cards]) => `${n} ${n === '1' ? 'gap' : 'gaps'}: ${cards} cards`).join(' · ')}.`,
  '',
  '## 3. Next batch (25 tasks, one per card)',
  '',
  '| # | Kind | Record | Field | Time box |',
  '|---|---|---|---|---|',
  ...batch.map((task, index) => `| ${index + 1} | ${task.kind} | \`${task.id}\` ${task.name} | ${task.fields.join(', ')} | ${task.timeboxMinutes ? `${task.timeboxMinutes} min` : 'fix'} |`),
  '',
);

console.log(`${totals.published} published cards (${totals.approved} approved, ${totals.awaitingReview} awaiting review), ${totals.blocked} blocked.`);
for (const item of blocking) console.log(`  BLOCKED ${item.id}: ${item.problems.map((problem) => problem.field).join(', ')}`);
for (const pass of passes) console.log(`  pass ${pass.order} ${pass.field.padEnd(16)} open ${String(pass.open).padStart(4)}  settled ${pass.settled}`);

if (!process.argv.includes('--no-write')) {
  const dir = new URL('reports/fields/', root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('field-queue.md', dir), lines.join('\n'));
  writeFileSync(new URL('field-queue.json', dir), `${JSON.stringify({ generatedAt: today, ...queue, nextBatch: batch }, null, 2)}\n`);
  console.log('Wrote reports/fields/field-queue.md and field-queue.json');
}

const brokenApproved = blocking.filter((item) => item.status === 'approved');
if (brokenApproved.length) {
  console.error(`Approved records with blocking problems: ${brokenApproved.map((item) => item.id).join(', ')}`);
  process.exitCode = 1;
}
