// Duplicate cards, one place recorded twice and wrong governorates. The full audit
// (tools/content-pipeline/audit_identity.py) is committed with its decisions; these fast checks catch the
// obvious cases in every test run.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const records = read('../src/data/sites.json');
const audit = read('../tools/content-pipeline/data/identity/identity-audit.json');
const fold = (value) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const SLUG = { Nineveh: 'nineveh', Duhok: 'duhok', Erbil: 'erbil', Sulaymaniyah: 'sulaymaniyah', Kirkuk: 'kirkuk', 'Salah al-Din': 'salah-al-din', Diyala: 'diyala', Baghdad: 'baghdad', Anbar: 'anbar' };

test('every finding of the last identity audit has a decision', () => {
  assert.deepEqual(audit.pairs.filter((pair) => !pair.decided).map((pair) => pair.ids.join(' ~ ')), []);
  assert.deepEqual(audit.recordChecks.filter((row) => !row.decision).map((row) => `${row.id} ${row.check}`), []);
});

test('ids are unique and no two cards in one governorate share a primary name', () => {
  assert.equal(new Set(records.map((record) => record.id)).size, records.length);
  const seen = new Map();
  const clashes = [];
  for (const record of records) {
    const key = `${record.governorate}|${fold(record.name)}`;
    if (seen.has(key)) clashes.push(`${seen.get(key)} = ${record.id}`);
    seen.set(key, record.id);
  }
  assert.deepEqual(clashes, []);
});

test('the id names the record’s governorate', () => {
  const wrong = records.filter((record) => record.id !== 'site-001' && !record.id.startsWith(`site-${SLUG[record.governorate]}-`));
  assert.deepEqual(wrong.map((record) => `${record.id} (${record.governorate})`), []);
});

test('a parent named in the heritage status is linked, and every parent exists in the same governorate', () => {
  const byId = new Map(records.map((record) => [record.id, record]));
  const problems = [];
  for (const record of records) {
    const named = /\b(site-[a-z0-9-]+)/.exec(record.heritage_status ?? '')?.[1];
    if (named && named !== record.id && byId.has(named) && record.parentSite !== named) problems.push(`${record.id}: status names ${named}`);
    if (record.parentSite && !byId.has(record.parentSite)) problems.push(`${record.id}: no parent ${record.parentSite}`);
    if (record.parentSite && byId.get(record.parentSite)?.governorate !== record.governorate) problems.push(`${record.id}: parent in another governorate`);
  }
  assert.deepEqual(problems, []);
});
