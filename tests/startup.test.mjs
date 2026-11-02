import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preloadInitialRoute } from '../src/router/preloadInitialRoute.js';

test('startup preload cannot withhold the app shell for a stalled route', async () => {
  let rejectDownload;
  const stalled = new Promise((_, reject) => { rejectDownload = reject; });
  await preloadInitialRoute(() => stalled, 0);
  // A download can fail after the shell has mounted; the race must still handle it.
  rejectDownload(new Error('late download failure'));
  await Promise.resolve();
});

test('startup preload resolves fast routes and exposes immediate import failures', async () => {
  let ready = false;
  await preloadInitialRoute(async () => { ready = true; });
  assert.equal(ready, true);
  await assert.rejects(preloadInitialRoute(() => Promise.reject(new Error('import failed'))), /import failed/);
});
