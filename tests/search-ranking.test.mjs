import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const { searchSites } = await server.ssrLoadModule('/src/utils/search.js');
const { sortSites } = await server.ssrLoadModule('/src/utils/filterSites.js');
const ids = (sites) => sites.map((site) => site.id);

test('search ranks primary names, aliases, name prefixes, metadata, then descriptions stably', () => {
  const sites = [
    { id: 'description', name: 'Ancient ruins', description: 'The Hatra monument' },
    { id: 'metadata-a', name: 'Tower', governorate: 'Hatra' },
    { id: 'metadata-b', name: 'Abbey', civilization: 'Hatra' },
    { id: 'prefix', name: 'Hatra Temple' },
    { id: 'word', name: 'Great Hatra temple' },
    { id: 'alias', name: 'Old City', aliases: ['Hatra'] },
    { id: 'exact', name: 'Hatra' },
  ];
  const expected = ['exact', 'alias', 'prefix', 'word', 'metadata-a', 'metadata-b', 'description'];
  assert.deepEqual(ids(searchSites(sites, 'Hatra', { includeMetadata: true })), expected);
  assert.deepEqual(ids(sortSites(searchSites(sites, 'Hatra', { includeMetadata: true }), { q: 'Hatra', sort: '' })), expected);
  assert.deepEqual(ids(sortSites(searchSites(sites, 'Hatra', { includeMetadata: true }), { q: 'Hatra', sort: 'name' })), ['metadata-b', 'description', 'word', 'exact', 'prefix', 'alias', 'metadata-a']);
});

test('all folded words are required, metadata stays opt-in, and empty queries preserve order', () => {
  const sites = [{ id: 'a', name: 'Café القَصْر', aliases: ['Qasr'], city: 'Mosul', archiveNo: 'HIC-42', category: 'Temple', description: 'River monument' }, { id: 'b', name: 'Other' }];
  assert.deepEqual(ids(searchSites(sites, 'قصر cafe')), ['a']);
  assert.deepEqual(ids(searchSites(sites, 'qasr mosul', { includeMetadata: true })), ['a']);
  for (const query of ['river', 'mosul', 'HIC-42', 'temple']) {
    assert.deepEqual(ids(searchSites(sites, query)), []);
    assert.deepEqual(ids(searchSites(sites, query, { includeMetadata: true })), ['a']);
  }
  assert.deepEqual(searchSites(sites, '   '), sites);
  assert.deepEqual(searchSites(sites, 'cafe missing', { includeMetadata: true }), []);
});

test('metadata phrase matches outrank distributed terms and denser descriptions remain below names', () => {
  const metadata = [
    { id: 'distributed', name: 'Old place', governorate: 'Northern', civilization: 'Temple' },
    { id: 'phrase', name: 'Other place', governorate: 'Northern Temple' },
  ];
  assert.deepEqual(ids(searchSites(metadata, 'northern temple', { includeMetadata: true })), ['phrase', 'distributed']);
  const descriptions = [
    { id: 'sparse', name: 'A', description: `Ritual ${'ancient stones '.repeat(40)}` },
    { id: 'dense', name: 'B', description: 'Ritual ritual ritual chambers.' },
    { id: 'name', name: 'Ritual monument' },
  ];
  assert.deepEqual(ids(searchSites(descriptions, 'ritual', { includeMetadata: true })), ['name', 'dense', 'sparse']);
  assert.deepEqual(ids(searchSites([{ id: 'first', name: 'A', governorate: 'Hatra' }, { id: 'second', name: 'B', governorate: 'Hatra' }], 'hatra', { includeMetadata: true })), ['first', 'second']);
});
