import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(async () => server.close());
const load = () => server.ssrLoadModule('/src/utils/heritageExperience.js');
const source = { evidenceId: 'report', sourceName: 'UNESCO', title: 'Condition report', url: 'https://whc.unesco.org/en/list/1', accessedAt: '2020-02-29', accessLevel: 'full-text' };
const claim = { siteId: 'site', verification_status: 'verified', reviewedBy: 'Editor', reviewedAt: '2020-03-01', sourceRefs: ['report'] };
const site = (extra = {}) => ({ id: 'site', status: 'approved', sources: [source], ...extra });

test('exports canonical state, narrative and event choices', async () => {
  const api = await load();
  assert.deepEqual(api.PRESERVATION_STATES.map((item) => item.id), ['preserved', 'restored', 'damaged', 'heavily-damaged', 'reconstructed', 'endangered', 'destroyed', 'lost', 'disappeared', 'unknown']);
  assert.equal(api.PRESERVATION_STATES.find((item) => item.id === 'heavily-damaged').label, 'Heavily Damaged');
  assert.deepEqual(api.STORY_TYPES.map((item) => item.id), ['history', 'architecture', 'significance', 'restoration', 'destruction', 'digital-documentation']);
  assert.deepEqual(api.EVENT_TYPES.map((item) => item.id), ['construction', 'renovation', 'destruction', 'excavation', 'restoration', 'reconstruction', 'unesco-inscription', 'damage']);
});

test('missing and legacy conditions remain unverified and explicit unknown blocks fallback', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  assert.deepEqual(normalize(null), { preservation: { state: 'unknown', reportedState: 'unknown', verified: false, asOf: '', summary: '', sources: [], reviewedAt: '' }, storySections: [], historicalEvents: [] });
  for (const [input, expected] of [['Destroyed', 'destroyed'], ['heavily damaged', 'heavily-damaged'], ['possibly destroyed in war', 'unknown']]) {
    const result = normalize(site({ preservation_status: input })).preservation;
    assert.equal(result.state, 'unknown');
    assert.equal(result.reportedState, expected);
    assert.equal(result.verified, false);
  }
  assert.equal(normalize(site({ preservation: { state: 'unknown' }, preservation_status: 'Destroyed' })).preservation.reportedState, 'unknown');
});

test('reviewed preservation projects only bound evidence and does not mutate authoring data', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const raw = site({ preservation: { ...claim, state: 'destroyed', summary: 'Documented condition.', asOf: '2020-02-29' } });
  const before = structuredClone(raw);
  const result = normalize(raw).preservation;
  assert.equal(result.state, 'destroyed');
  assert.equal(result.verified, true);
  assert.equal(result.summary, 'Documented condition.');
  assert.equal(result.asOf, '2020-02-29');
  assert.equal(result.reviewedAt, '2020-03-01');
  assert.deepEqual(result.sources, [source]);
  assert.deepEqual(raw, before);
});

test('every claim gate fails closed independently including contradictory supplied aliases', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const badClaims = [
    { siteId: undefined }, { siteId: 'other' }, { verification_status: undefined },
    { verificationStatus: 'draft' }, { verification_status: '' }, { verified: false },
    { reviewedBy: '' }, { reviewedAt: '2020-02-30' }, { reviewedAt: '9999-01-01' },
    { sourceRefs: [] }, { sourceRefs: ['missing'] }, { sourceRefs: ['report', 'missing'] },
    { asOf: '2020-02-30' }, { asOf: '9999-01-01' }, { state: 'unknown' },
  ];
  for (const bad of badClaims) {
    const result = normalize(site({ preservation: { ...claim, state: 'destroyed', summary: 'Hidden draft.', ...bad } })).preservation;
    assert.equal(result.verified, false, JSON.stringify(bad));
    assert.equal(result.state, 'unknown');
    assert.equal(result.summary, '');
    assert.deepEqual(result.sources, []);
  }
  assert.equal(normalize(site({ status: 'draft', preservation: { ...claim, state: 'destroyed' } })).preservation.verified, false);
});

test('evidence must be unique credible full-text dated and safe for every reference', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  for (const bad of [
    { evidenceId: '' }, { sourceName: '' }, { url: 'javascript:alert(1)' }, { url: 'https://unknown.invalid/report' },
    { accessedAt: '2020-02-30' }, { accessedAt: '9999-01-01' }, { accessedAt: undefined },
    { accessLevel: 'snippet' }, { accessLevel: 'unknown' }, { accessLevel: undefined },
  ]) {
    assert.equal(normalize(site({ sources: [{ ...source, ...bad }], preservation: { ...claim, state: 'lost' } })).preservation.verified, false, JSON.stringify(bad));
  }
  assert.equal(normalize(site({ sources: [source, { ...source }], preservation: { ...claim, state: 'lost' } })).preservation.verified, false);
});

test('only individually reviewed narrative sections publish with standard headings and valid unique ids', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const section = { ...claim, id: 'history', type: 'history', text: 'A reviewed history.', title: 'Ignore authored heading' };
  const result = normalize(site({ story_sections: [null, section, { ...section }, { ...section, id: 'draft', verification_status: 'draft' }, { ...section, id: '', type: 'architecture' }, { ...section, id: 'other', type: 'invented' }] }));
  assert.deepEqual(result.storySections, [{ id: 'history', type: 'history', title: 'History', text: 'A reviewed history.', sources: [source], reviewedAt: claim.reviewedAt }]);
});

test('reviewed events preserve BCE ranges precision exact dates and stable chronology', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const event = (extra) => ({ ...claim, id: 'event', type: 'construction', title: 'Recorded event', description: 'Reviewed account.', ...extra });
  const result = normalize(site({ historical_events: [
    event({ id: 'dated', year: 1900, date: '1900-05-02' }), event({ id: 'range', year: -500, endYear: -400, precision: 'approximate' }),
    event({ id: 'same-a', year: 1800 }), event({ id: 'same-b', year: 1800 }), event({ id: 'earlier', year: 1900, date: '1900-01-01' }),
  ] })).historicalEvents;
  assert.deepEqual(result.map((item) => item.id), ['range', 'same-a', 'same-b', 'earlier', 'dated']);
  assert.equal(result[0].when, 'c. 500 BCE–400 BCE');
  assert.equal(result[0].endYear, -400);
  assert.equal(result[1].when, '1800');
  assert.equal(result[1].precision, 'exact');
  assert.equal(result[1].endYear, null);
  assert.equal(result[4].when, '1900-05-02');
  assert.equal(result[4].verified, true);
  assert.deepEqual(result[0].sources, [source]);
});

test('malformed and unreviewed chronology is excluded without promoting legacy timeline', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const event = { ...claim, id: 'event', type: 'construction', title: 'Event', year: 1900 };
  const invalid = [{ year: 0 }, { year: '1900' }, { year: -10000 }, { year: 9999 }, { year: 1.5 }, { endYear: 1899 }, { endYear: 9999 }, { endYear: 0 }, { precision: 'unknown' }, { date: '1900-02-29' }, { date: '1901-01-01' }, { year: -500, date: '0500-01-01' }, { endYear: 1901, date: '1900-01-01' }, { verificationStatus: 'draft' }, { id: '' }, { type: 'invented' }];
  for (const bad of invalid) assert.deepEqual(normalize(site({ historical_events: [{ ...event, ...bad }] })).historicalEvents, [], JSON.stringify(bad));
  assert.deepEqual(normalize(site({ timeline: [event] })).historicalEvents, []);
  assert.equal(normalize(site({ historical_events: [event, event] })).historicalEvents.length, 1);
});

test('disappeared membership requires reviewed loss or destruction on an approved normalized site', async () => {
  const { normalizeHeritageExperience: normalize, isDisappearedSite } = await load();
  const normalized = (extra) => { const raw = site(extra); return { ...raw, ...normalize(raw) }; };
  assert.equal(isDisappearedSite(null), false);
  assert.equal(isDisappearedSite(normalized({ isLost: true, decks: ['lost'], preservation_status: 'Destroyed' })), false);
  for (const state of ['destroyed', 'lost', 'disappeared', 'heavily-damaged']) assert.equal(isDisappearedSite(normalized({ preservation: { ...claim, state } })), true);
  assert.equal(isDisappearedSite(normalized({ preservation: { ...claim, state: 'damaged' } })), false);
  const rebuilt = normalized({ preservation: { ...claim, state: 'restored' }, historical_events: [{ ...claim, id: 'loss', type: 'destruction', title: 'Destruction', year: 1900 }] });
  assert.equal(isDisappearedSite(rebuilt), true);
  assert.equal(isDisappearedSite({ ...rebuilt, status: 'draft' }), false);
  assert.equal(isDisappearedSite({ ...rebuilt, historicalEvents: [{ type: 'destruction', verified: false }] }), false);
});

test('explicit malformed preservation blocks legacy fallback', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  for (const preservation of [null, 'Destroyed', []]) {
    assert.equal(normalize(site({ preservation, preservation_status: 'Destroyed' })).preservation.reportedState, 'unknown');
  }
});

test('optional null dates remain unknown without blocking reviewed claims', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const result = normalize(site({ preservation: { ...claim, state: 'restored', asOf: null }, historical_events: [
    { ...claim, id: 'restored', type: 'restoration', title: 'Restoration', year: 1900, date: null },
  ] }));
  assert.equal(result.preservation.verified, true);
  assert.equal(result.preservation.asOf, '');
  assert.equal(result.historicalEvents[0].date, '');
  assert.equal(result.historicalEvents[0].when, '1900');
});

test('narrative types have unique headings', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const result = normalize(site({ sources: [{ ...source, title: '' }], story_sections: [
    { ...claim, id: 'draft', type: 'architecture', text: 'Draft.', verified: false },
    { ...claim, id: 'first', type: 'architecture', text: 'First reviewed account.' },
    { ...claim, id: 'second', type: 'architecture', text: 'Second reviewed account.' },
    { ...claim, id: 'first', type: 'history', text: 'Duplicate ID.' },
  ] }));
  assert.deepEqual(result.storySections.map((section) => section.id), ['first']);
});

test('published source titles fall back to the source name', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const result = normalize(site({ sources: [{ ...source, title: '' }], preservation: { ...claim, state: 'restored' } }));
  assert.equal(result.preservation.sources[0].title, 'UNESCO');
});

test('timezone qualified review evidence and assessment dates remain eligible and preserve authored values', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const reviewedAt = '2020-03-01T12:30:45.125+03:00';
  const accessedAt = '2020-02-29T23:59:59Z';
  const asOf = '2020-02-29T14:15:16-05:30';
  const result = normalize(site({ sources: [{ ...source, accessedAt }], preservation: { ...claim, reviewedAt, state: 'restored', asOf },
    historical_events: [{ ...claim, reviewedAt, id: 'timestamp', type: 'restoration', title: 'Event', year: 1900, date: '1900-03-01T10:30:00+03:00' }] }));
  assert.equal(result.preservation.verified, true);
  assert.equal(result.preservation.reviewedAt, reviewedAt);
  assert.equal(result.preservation.asOf, asOf);
  assert.equal(result.preservation.sources[0].accessedAt, accessedAt);
  assert.equal(result.historicalEvents[0].date, '1900-03-01T10:30:00+03:00');
  assert.equal(result.historicalEvents[0].reviewedAt, reviewedAt);
});

test('timestamp claims reject malformed calendars times offsets missing zones and future instants', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  for (const value of ['2020-02-30T12:30:00Z', '2020-03-01T24:00:00Z', '2020-03-01T12:60:00Z', '2020-03-01T12:30:60Z', '2020-03-01T12:30:00+25:00', '2020-03-01T12:30:00+03:60', '2020-03-01T12:30:00', '9999-01-01T00:00:00Z']) {
    assert.equal(normalize(site({ preservation: { ...claim, reviewedAt: value, state: 'restored' } })).preservation.verified, false, value);
    assert.equal(normalize(site({ sources: [{ ...source, accessedAt: value }], preservation: { ...claim, state: 'restored' } })).preservation.verified, false, value);
    assert.equal(normalize(site({ preservation: { ...claim, state: 'restored', asOf: value } })).preservation.verified, false, value);
  }
});

test('event timestamps sort by instant and still require matching authored years and valid calendars', async () => {
  const { normalizeHeritageExperience: normalize } = await load();
  const event = { ...claim, type: 'restoration', title: 'Event', year: 1900 };
  const result = normalize(site({ historical_events: [
    { ...event, id: 'later', date: '1900-01-01T01:00:00-02:00' },
    { ...event, id: 'earlier', date: '1900-01-01T02:00:00+02:00' },
    { ...event, id: 'same', date: '1900-01-01T00:00:00Z' },
    { ...event, id: 'bad-year', date: '1901-01-01T00:00:00Z' },
    { ...event, id: 'bad-calendar', date: '1900-02-29T00:00:00Z' },
    { ...event, id: 'bad-time', date: '1900-01-01T25:00:00Z' },
  ] })).historicalEvents;
  assert.deepEqual(result.map((item) => item.id), ['earlier', 'same', 'later']);
});
