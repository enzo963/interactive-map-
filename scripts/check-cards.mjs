/**
 * Audit src/data/sites.json against the visible card contract (src/utils/cardReadiness.js).
 *   npm run check:cards            summary, hidden records and enrichment gaps
 *   npm run check:cards -- --list  also list every hidden record with what it lacks
 *   npm run check:cards -- --queue also list every visible card in the source review queue
 * Exits 1 when an approved record fails the contract, since approval must never hide a card.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' });
const { checkCardReadiness, verificationFlags, VISIBLE_STATUSES } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
const { bestTier } = await server.ssrLoadModule('/src/utils/sourceCredibility.js');
await server.close();

const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const checked = records.map((record) => ({ record, ...checkCardReadiness(record) }));
const count = (items, key) => items.reduce((totals, item) => {
  for (const value of key(item)) totals[value] = (totals[value] ?? 0) + 1;
  return totals;
}, {});
const table = (totals) => Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, n]) => `  ${String(n).padStart(4)}  ${name}`).join('\n');

const visible = checked.filter((item) => item.visible);
const notReady = checked.filter((item) => !item.ready);
const parked = checked.filter((item) => item.ready && !VISIBLE_STATUSES.includes(item.record.status));
console.log(`${records.length} records: ${visible.length} visible cards, ${notReady.length} missing required fields, ${parked.length} complete but not published (draft/withdrawn).`);
if (notReady.length) {
  console.log(`\nMissing required fields:\n${table(count(notReady, (item) => item.missing.map((m) => m.field)))}`);
  const shown = process.argv.includes('--list') ? notReady : notReady.slice(0, 15);
  for (const item of shown) console.log(`  ${item.record.id}: ${item.missing.map((m) => m.field).join(', ')}`);
  if (shown.length < notReady.length) console.log(`  … ${notReady.length - shown.length} more (--list)`);
}
console.log(`\nEnrichment gaps among visible cards (do not hide a card):\n${table(count(visible, (item) => item.enrichment))}`);

const components = count(records, (record) => (record.parentSite ? [record.parentSite] : []));
const queue = visible.map((item) => ({ ...item, flags: verificationFlags(item.record, { componentCount: components[item.record.id] ?? 0 }) }));
console.log(`\nStrongest evidence per visible card:\n${table(count(visible, (item) => [`tier ${bestTier(item.record.sources)}`]))}`);
console.log(`\nSource review queue (visible cards; strengthen, do not hide):\n${table(count(queue, (item) => item.flags))}`);
if (process.argv.includes('--queue')) {
  for (const item of queue.filter((entry) => entry.flags.length)) console.log(`  ${item.record.id}: ${item.flags.join(', ')}`);
}

const brokenApproved = notReady.filter((item) => item.record.status === 'approved');
if (brokenApproved.length) {
  console.error(`\nApproved records failing the contract: ${brokenApproved.map((item) => item.record.id).join(', ')}`);
  process.exitCode = 1;
}
