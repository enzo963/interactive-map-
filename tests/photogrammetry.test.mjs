import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(async () => server.close());
const load = () => server.ssrLoadModule('/src/utils/photogrammetry.js');
const project = { id: 'survey', title: 'Reviewed survey', siteId: 'site', verification_status: 'verified', our_work: true,
  status: 'in-progress', creator: 'Survey team', modelUrls: ['/model.glb', '/wrong.glb'], photographUrls: ['/photo.jpg'],
  documentation: [{ title: 'Survey report', url: 'https://example.org/report', verification_status: 'verified', siteId: 'site' }],
  reconstruction: { description: 'Interpretation of a missing roof.', uncertainties: 'Roof height is uncertain.' } };

test('planned projects remain project records without becoming completed documentation', async () => {
  const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
  const [site] = normalizeSites([{ id: 'site', name: 'Planning record', status: 'approved', photogrammetry_projects: [
    { ...project, status: 'planned', modelUrls: [], photographUrls: [], documentation: [] },
  ] }]);
  assert.equal(site.photogrammetryProjects.length, 1);
  assert.equal(site.hasOurWork, false);
  assert.deepEqual(site.ourWorkTypes, []);
});

test('photogrammetry project publication and model links require independent review and site binding', async () => {
  const { normalizePhotogrammetryProjects } = await load();
  const raw = { id: 'site', status: 'approved', photogrammetry_projects: [project, { ...project, id: 'draft', verification_status: 'draft' }, { ...project, id: 'wrong', siteId: 'other' }] };
  const models = [{ url: '/model.glb', verified: true, siteId: 'site', verificationStatus: 'verified' }, { url: '/wrong.glb', verified: true, siteId: 'other' }];
  const before = structuredClone(raw);
  const result = normalizePhotogrammetryProjects(raw, { images: [], modelResources: models });
  assert.equal(result.length, 1);
  assert.equal(result[0].ourWork, true);
  assert.equal(result[0].status, 'in-progress');
  assert.deepEqual(result[0].models.map((model) => model.url), ['/model.glb']);
  assert.equal(result[0].documents[0].url, 'https://example.org/report');
  assert.equal(result[0].reconstruction.uncertainties, project.reconstruction.uncertainties);
  assert.deepEqual(raw, before);
  assert.deepEqual(normalizePhotogrammetryProjects({ ...raw, status: 'needs-review' }, { modelResources: models }), []);
});

test('projects never publish unreviewed images, unsafe documents or inferred ownership', async () => {
  const { normalizePhotogrammetryProjects } = await load();
  const raw = { id: 'site', status: 'approved', photogrammetry_projects: [{ ...project, our_work: false, documentation: [
    { title: 'Unsafe', url: 'javascript:bad', verification_status: 'verified' },
    { title: 'Unreviewed', url: 'https://example.org/draft', verification_status: 'draft' },
  ] }] };
  const result = normalizePhotogrammetryProjects(raw, { images: [{ src: '/photo.jpg', siteId: 'site', license_status: 'verified' }], modelResources: [] });
  assert.equal(result[0].ourWork, false);
  assert.deepEqual(result[0].images, []);
  assert.deepEqual(result[0].documents, []);
  assert.deepEqual(result[0].models, []);
});

test('explicit false review flags prevent project and document publication', async () => {
  const { normalizePhotogrammetryProjects } = await load();
  const raw = { id: 'site', status: 'approved', photogrammetry_projects: [{ ...project, verified: false }] };
  assert.deepEqual(normalizePhotogrammetryProjects(raw, {}), []);
  raw.photogrammetry_projects = [{ ...project, documentation: [{ ...project.documentation[0], verified: false }] }];
  assert.deepEqual(normalizePhotogrammetryProjects(raw, {})[0].documents, []);
});
