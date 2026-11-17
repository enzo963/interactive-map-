import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

/**
 * A middleware-mode Vite server for SSR tests.
 *
 * `node --test` runs test files in parallel, and some files load the project config while others use
 * `configFile: false`. Sharing one dependency-optimizer cache (node_modules/.vite) let each server
 * re-optimize and rewrite it while another was still loading modules, which stalled module fetches past
 * Vite's 60s transport timeout. Each test file therefore gets its own cache directory.
 */
export function createTestServer(testUrl, options = {}) {
  const name = basename(fileURLToPath(testUrl), '.test.mjs');
  return createServer({
    ...options,
    cacheDir: fileURLToPath(new URL(`../../node_modules/.vite-tests/${name}`, import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, ...options.server },
    appType: 'custom',
  });
}
