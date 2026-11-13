import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('local editing rejects cross-origin writes, unsafe requests and invalid positions before touching data', { timeout: 10000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'history-editor-'));
  try {
    // Copy the real plugin into an isolated project; no request can write the real archive.
    await mkdir(join(dir, 'vite'));
    await mkdir(join(dir, 'src/data'), { recursive: true });
    const pluginFile = join(dir, 'vite/sitesApi.mjs');
    const dataFile = join(dir, 'src/data/sites.json');
    await writeFile(pluginFile, await readFile(new URL('../vite/sitesApi.js', import.meta.url)));
    const initial = JSON.stringify([{ id: 'existing', name: 'Existing site', slug: 'existing', status: 'approved' }]);
    await writeFile(dataFile, initial);
    const { default: sitesApi } = await import(pathToFileURL(pluginFile).href);
    let handler;
    sitesApi().configureServer({ middlewares: { use(path, middleware) {
      assert.equal(path, '/api/sites'); handler = middleware;
    } } });
    const request = ({ origin = 'http://127.0.0.1:5177', type = 'application/json', address = '127.0.0.1', url = '/', method = 'POST', body = { name: 'Draft place', latitude: 35, longitude: 43 } } = {}) => new Promise((resolve, reject) => {
      const req = Object.assign(new EventEmitter(), {
        method, url, socket: { remoteAddress: address },
        headers: { host: '127.0.0.1:5177', ...(origin === null ? {} : { origin }), 'content-type': type },
      });
      const res = { statusCode: 200, setHeader() {}, end(value) { resolve({ status: this.statusCode, data: JSON.parse(value) }); } };
      Promise.resolve(handler(req, res, () => resolve({ status: 404 }))).catch(reject);
      queueMicrotask(() => { req.emit('data', JSON.stringify(body)); req.emit('end'); });
    });
    for (const options of [{ origin: 'https://untrusted.invalid' }, { origin: null }, { address: '192.168.1.10' }]) {
      assert.equal((await request(options)).status, 403);
      assert.equal(await readFile(dataFile, 'utf8'), initial);
    }
    assert.equal((await request({ type: 'text/plain' })).status, 415);
    for (const body of [{ name: 'Invalid', latitude: 91, longitude: 43 }, { name: 'Invalid', latitude: 35, longitude: -181 }, null, []]) {
      assert.equal((await request({ body })).status, 400);
      assert.equal(await readFile(dataFile, 'utf8'), initial);
    }
    assert.equal((await request({ url: '/%ZZ', method: 'PATCH' })).status, 400);
    assert.equal((await request({ body: { name: 'Large', latitude: 35, longitude: 43, description: 'x'.repeat(1000001) } })).status, 413);
    assert.equal(await readFile(dataFile, 'utf8'), initial);
    const created = await request();
    assert.equal(created.status, 201);
    assert.equal(created.data.status, 'draft');
    assert.equal((await request({ method: 'PATCH', url: '/existing', body: { latitude: 34.5, longitude: 44.2 } })).status, 200);
    assert.equal(JSON.parse(await readFile(dataFile, 'utf8')).length, 2);
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), 'history-editor-')));
    await rm(dir, { recursive: true, force: true });
  }
});
