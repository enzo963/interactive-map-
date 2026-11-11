// The governorate coverage report uses the site's own rules, so its numbers match the published archive.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { coverageByGovernorate, COVERAGE_GOVERNORATES } = await server.ssrLoadModule('/src/utils/coverage.js');
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { approvedCover } = await server.ssrLoadModule('/src/utils/coverApproval.js');
after(async () => { await server.close(); });

const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));

test('totals agree with the published archive', () => {
  const { rows, totals } = coverageByGovernorate(records);
  assert.equal(rows.length, 9);
  assert.deepEqual(rows.map((row) => row.key), COVERAGE_GOVERNORATES.map(([key]) => key));
  const published = getAllSites();
  assert.equal(totals.published, published.length);
  assert.equal(totals.image, published.filter((site) => approvedCover(site)).length);
  assert.equal(totals.coordinates, published.filter((site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude)).length);
  assert.equal(totals.archived, records.length, 'every record belongs to one of the nine governorates');
  assert.equal(totals.approved + totals.review, records.filter((record) => ['approved', 'needs-review', 'draft'].includes(record.status)).length);
});

test('discovered counts distinct candidates once, including those merged away', () => {
  const base = { governorate: 'Erbil', status: 'needs-review' };
  const { rows } = coverageByGovernorate([{ id: 'a', ...base }], [{ id: 'a', ...base }, { id: 'merged', ...base }, { id: 'b', governorate: 'Slemani' }]);
  const erbil = rows.find((row) => row.key === 'erbil');
  assert.equal(erbil.discovered, 2);
  assert.equal(erbil.archived, 1);
  assert.equal(rows.find((row) => row.key === 'sulaymaniyah').discovered, 1, 'governorate aliases resolve');
});

test('the lagging governorate has the lowest mean share, and ties are all marked', () => {
  const { rows, lagging, lowest } = coverageByGovernorate(records);
  const min = Math.min(...rows.map((row) => row.score));
  assert.equal(rows.find((row) => row.key === lagging).score, min);
  assert.equal(rows.find((row) => row.key === lagging).rank, 9);
  for (const keys of Object.values(lowest)) assert.ok(keys.length >= 1);
  const empty = coverageByGovernorate([]);
  assert.equal(empty.lowest.image.length, 9, 'with no data every governorate ties');
});
