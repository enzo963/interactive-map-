import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, createServer } from 'vite';
import publishedSites from '../vite/publishedSites.js';

const root = fileURLToPath(new URL('../', import.meta.url));

for (const approvedOnly of [false, true]) {
  test(`production ${approvedOnly ? 'approved release' : 'visible archive'} preserves cards and archive numbers within chunk budgets`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'history-production-'));
    const sourceFile = join(root, 'src/data/sites.json');
    const before = await readFile(sourceFile, 'utf8');
    const records = JSON.parse(before);
    const originalReleaseFlag = process.env.HB_RELEASE_APPROVED_ONLY;
    if (approvedOnly) process.env.HB_RELEASE_APPROVED_ONLY = '1';
    else delete process.env.HB_RELEASE_APPROVED_ONLY;
    const originalNodeEnv = process.env.NODE_ENV;
    const restoreNodeEnv = () => {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    };
    const server = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
    let visible;
    let normalized;
    try {
      const { isVisibleCard } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
      const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
      normalized = normalizeSites(records);
      visible = new Set(records.filter((record) => isVisibleCard(record) && (!approvedOnly || record.status === 'approved')).map((record) => record.id));
      const valid = records.find((record) => record.status === 'approved' && isVisibleCard(record));
      assert.ok(valid, 'Fixture contains a complete approved record');
      assert.equal(isVisibleCard({ ...valid, status: 'needs-review' }), true, 'Review-ready cards stay visible');
      for (const status of ['draft', 'withdrawn']) {
        assert.equal(isVisibleCard({ ...valid, status }), false, `${status} cards stay hidden`);
      }
      assert.equal(isVisibleCard({ ...valid, description: '' }), false, 'Incomplete approved cards stay hidden');
    } finally {
      await server.close();
      restoreNodeEnv();
    }
    try {
      const filter = publishedSites();
      filter.configResolved({ root });
      await filter.buildStart();
      const emitted = JSON.parse(filter.transform(before, sourceFile).code);
      assert.deepEqual(emitted.map((record) => record.id), records.filter((record) => visible.has(record.id)).map((record) => record.id));
      const archives = new Map(normalized.map((site) => [site.id, site.archiveNo]));
      for (const record of emitted) assert.equal(record.archive_no, archives.get(record.id), `${record.id}: stable archive number`);
      // Renormalizing exactly the filtered client JSON must preserve full-source numbering.
      const checkServer = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
      try {
        const { normalizeSites } = await checkServer.ssrLoadModule('/src/utils/siteAdapter.js');
        for (const site of normalizeSites(emitted)) assert.equal(site.archiveNo, archives.get(site.id), `${site.id}: client archive number`);
      } finally {
        await checkServer.close();
        restoreNodeEnv();
      }
      await build({ root, configFile: join(root, 'vite.config.js'), logLevel: 'silent', build: { outDir: dir, emptyOutDir: true } });
      const files = await readdir(join(dir, 'assets'));
      const scriptFiles = files.filter((file) => file.endsWith('.js'));
      const scriptBodies = await Promise.all(scriptFiles.map((file) => readFile(join(dir, 'assets', file), 'utf8')));
      const scripts = scriptBodies.join('\n');
      // Exercise browser entry dependency order, which static scans cannot validate.
      await writeFile(join(dir, 'package.json'), '{"type":"module"}');
      const dataModules = await Promise.all(scriptFiles.filter((file) => file.startsWith('sites-'))
        .map((file) => import(pathToFileURL(join(dir, 'assets', file)).href)));
      const bundledRecords = dataModules.flatMap((module) => Object.values(module).filter(Array.isArray).flat());
      const byId = (a, b) => a.id.localeCompare(b.id);
      assert.deepEqual(bundledRecords.sort(byId), emitted.sort(byId), 'Built data chunks contain the complete expected payload');
      const metadataChunk = files.find((file) => /^useDocumentTitle-.*\.js$/.test(file));
      assert.ok(metadataChunk);
      await import(pathToFileURL(join(dir, 'assets', metadataChunk)).href);
      for (const record of records) {
        assert.equal(scripts.includes(record.id), visible.has(record.id), `${record.id}: visibility boundary`);
      }
      for (const marker of ['/api/sites', 'src/data/sites.json', 'hb-place__head', '@vite/client', 'localhost:5177', 'HB_RELEASE_APPROVED_ONLY']) {
        assert.equal(scripts.includes(marker), false, `Production excludes ${marker}`);
      }
      assert.ok(files.every((file) => !file.endsWith('.map')));
      assert.equal(await readFile(sourceFile, 'utf8'), before, 'Source research stays intact');
      scriptBodies.forEach((body, index) => {
        const size = Buffer.byteLength(body);
        assert.ok(size <= 500 * 1024, `${scriptFiles[index]} (${size} bytes) exceeds the production chunk budget`);
        if (scriptFiles[index].startsWith('sites-')) assert.ok(size <= 350 * 1024, `${scriptFiles[index]} exceeds the data partition budget`);
      });
      assert.ok(scriptFiles.some((file) => file.startsWith('sites-')), 'Data uses independently cached governorate chunks');
      t.diagnostic(`${visible.size} cards; largest JS ${Math.max(...scriptBodies.map((body) => Buffer.byteLength(body)))} bytes; ${scriptFiles.filter((file) => file.startsWith('sites-')).length} data chunks`);
    } finally {
      assert.ok(dir.startsWith(join(tmpdir(), 'history-production-')));
      await rm(dir, { recursive: true, force: true });
      restoreNodeEnv();
      if (originalReleaseFlag === undefined) delete process.env.HB_RELEASE_APPROVED_ONLY;
      else process.env.HB_RELEASE_APPROVED_ONLY = originalReleaseFlag;
    }
  });
}
