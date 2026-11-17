// The resource repair queue (tools/content-pipeline/check_resources.py) is committed with the data:
// nothing a visitor would see broken (P1) may remain open, and every item names a published card.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const queue = read('../tools/content-pipeline/data/resources/repair-queue.json');
const ids = new Set(read('../src/data/sites.json').map((record) => record.id));

test('the repair queue covers the archive and has no open P1 item', () => {
  assert.ok(queue.cards > 0 && queue.links > 0 && queue.images > 0);
  assert.deepEqual(queue.items.filter((item) => item.priority === 'P1').map((item) => `${item.siteId} ${item.kind} ${item.target}`), []);
});

test('every queue item names a card, a problem, a priority and an action', () => {
  for (const item of queue.items) {
    assert.ok(ids.has(item.siteId), item.siteId);
    assert.ok(['P1', 'P2', 'P3'].includes(item.priority) && item.kind && item.target && item.action, JSON.stringify(item));
  }
});
