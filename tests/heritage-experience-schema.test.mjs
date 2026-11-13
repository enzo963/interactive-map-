import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const schema = JSON.parse(readFileSync(new URL('../src/data/sites.schema.json', import.meta.url), 'utf8'));
const validate = new Ajv({ allErrors: true, format: 'full' }).compile(schema);
const claim = { siteId: 'fixture', verification_status: 'draft', reviewedBy: 'Historian', reviewedAt: '2026-11-01', sourceRefs: ['source-one'] };
const record = { id: 'fixture', name: 'Fixture', governorate: 'Erbil', category: 'Citadel', period: '', description: '', unesco: null, has3D: null,
  coverImage: null, galleryImages: [], sources: [{ sourceName: 'Archive', url: '', evidenceId: 'source-one', accessedAt: '2026-11-01' }] };
const preservation = { ...claim, state: 'restored', asOf: null, summary: 'Restored fabric.' };
const story = { ...claim, id: 'history', type: 'history', text: 'Recorded history.' };
const event = { ...claim, id: 'foundation', type: 'construction', title: 'Foundation', year: -500, endYear: -490, precision: 'approximate', date: null };

test('optional heritage authoring accepts drafts, signed years and unknown dates', () => {
  assert.ok(validate([record]), JSON.stringify(validate.errors));
  assert.ok(validate([{ ...record, preservation, story_sections: [story], historical_events: [event] }]), JSON.stringify(validate.errors));
  for (const state of ['preserved', 'restored', 'damaged', 'heavily-damaged', 'reconstructed', 'endangered', 'destroyed', 'lost', 'disappeared', 'unknown']) {
    assert.ok(validate([{ ...record, preservation: { ...preservation, state } }]), state);
  }
});

test('authored structured claims require explicit review and source binding fields', () => {
  for (const [field, value] of [['preservation', preservation], ['story_sections', story], ['historical_events', event]]) {
    for (const required of ['siteId', 'verification_status', 'reviewedBy', 'reviewedAt', 'sourceRefs']) {
      const changed = { ...value }; delete changed[required];
      assert.equal(validate([{ ...record, [field]: field === 'preservation' ? changed : [changed] }]), false, `${field}.${required}`);
    }
    for (const bad of [{ sourceRefs: [] }, { sourceRefs: ['source-one', 'source-one'] }, { sourceRefs: [''] }, { reviewedAt: '2026-02-30' }, { verified: 'true' }, { verificationStatus: 'certain' }]) {
      const changed = { ...value, ...bad };
      assert.equal(validate([{ ...record, [field]: field === 'preservation' ? changed : [changed] }]), false, `${field}: ${JSON.stringify(bad)}`);
    }
  }
});

test('heritage schema rejects malformed state, narrative, event and calendar values', () => {
  for (const bad of [{ state: 'fine' }, { summary: {} }, { asOf: '2026-13-01' }]) assert.equal(validate([{ ...record, preservation: { ...preservation, ...bad } }]), false);
  for (const bad of [{ type: 'rumor' }, { text: {} }, { id: '' }]) assert.equal(validate([{ ...record, story_sections: [{ ...story, ...bad }] }]), false);
  for (const bad of [{ year: 0 }, { year: -10000 }, { year: 1.5 }, { year: '500' }, { endYear: 0 }, { precision: 'certain' }, { type: 'rumor' }, { date: 'yesterday' }]) {
    assert.equal(validate([{ ...record, historical_events: [{ ...event, ...bad }] }]), false, JSON.stringify(bad));
  }
});

test('public blocked preservation sentinel is valid and cannot carry approval', () => {
  assert.ok(validate([{ ...record, preservation: { state: 'unknown', verified: false } }]), JSON.stringify(validate.errors));
  for (const blocked of [{ state: 'unknown', verified: true }, { state: 'destroyed', verified: false },
    { state: 'unknown', verified: false, verification_status: 'approved' }]) {
    assert.equal(validate([{ ...record, preservation: blocked }]), false, JSON.stringify(blocked));
  }
});
