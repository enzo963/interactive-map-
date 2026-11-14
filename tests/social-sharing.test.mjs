import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { JSDOM } from 'jsdom';
import { buildSeo } from '../scripts/build-seo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://history.example';

test('Home and every published heritage URL serve complete sharing previews without JavaScript', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'history-sharing-'));
  let server;
  try {
    await build({
      root, configFile: join(root, 'vite.config.js'), logLevel: 'silent',
      define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(origin) },
      build: { outDir: dir, emptyOutDir: true },
    });
    await buildSeo({ outDir: dir, siteUrl: origin });
    server = await preview({
      root, configFile: false, logLevel: 'silent', build: { outDir: dir },
      preview: { host: '127.0.0.1', port: 0, open: false },
    });
    const local = `http://127.0.0.1:${server.httpServer.address().port}`;
    const records = JSON.parse(await readFile(join(root, 'src/data/sites.json'), 'utf8'))
      .filter((record) => record.status === 'approved');
    assert.ok(records.length > 0, 'Exercise the real published archive');
    const pages = [{ path: '/', name: 'History in Cards' }, ...records.map((record) => ({
      path: `/sites/${encodeURIComponent(record.slug)}`, name: record.name,
    }))];
    const descriptions = new Set();
    for (const { path, name } of pages) {
      const response = await fetch(`${local}${path}`, { headers: { 'User-Agent': 'facebookexternalhit/1.1' } });
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /text\/html/, path);
      const dom = new JSDOM(await response.text()); // Scripts intentionally do not execute.
      try {
        const doc = dom.window.document;
        const content = (attribute, key) => {
          const nodes = doc.head.querySelectorAll(`meta[${attribute}="${key}"]`);
          assert.equal(nodes.length, 1, `${path}: exactly one ${key}`);
          assert.ok(nodes[0].content.trim(), `${path}: nonempty ${key}`);
          return nodes[0].content;
        };
        const title = content('property', 'og:title');
        const description = content('property', 'og:description');
        assert.ok(title.includes(name), `${path}: title identifies the place`);
        assert.equal(title, doc.title, path);
        assert.ok(description.length > 40 && description.length <= 180, path);
        descriptions.add(description);
        assert.equal(content('property', 'og:type'), 'website', path);
        assert.equal(content('property', 'og:site_name'), 'History in Cards', path);
        assert.equal(content('property', 'og:url'), `${origin}${path}`, path);
        assert.equal(content('property', 'og:image'), `${origin}/social-card.png`, path);
        assert.equal(content('property', 'og:image:type'), 'image/png', path);
        assert.equal(content('property', 'og:image:width'), '1200', path);
        assert.equal(content('property', 'og:image:height'), '630', path);
        assert.match(content('property', 'og:image:alt'), /three illustrated heritage cards/i, path);
        assert.equal(content('name', 'twitter:card'), 'summary_large_image', path);
        assert.equal(content('name', 'twitter:title'), title, path);
        assert.equal(content('name', 'twitter:description'), description, path);
        assert.equal(content('name', 'twitter:image'), `${origin}/social-card.png`, path);
        assert.equal(content('name', 'twitter:image:alt'), content('property', 'og:image:alt'), path);
      } finally {
        dom.window.close();
      }
    }
    assert.equal(descriptions.size, pages.length, 'Each shared page has its own description');
    const imageResponse = await fetch(`${local}/social-card.png`);
    assert.equal(imageResponse.status, 200);
    assert.match(imageResponse.headers.get('content-type'), /image\/png/);
    const image = Buffer.from(await imageResponse.arrayBuffer());
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(image.readUInt32BE(16), 1200);
    assert.equal(image.readUInt32BE(20), 630);
    assert.ok(image.length < 1024 * 1024, 'Keep the preview graphic below 1 MB');
  } finally {
    if (server) {
      const closed = new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
      server.httpServer.closeAllConnections();
      await closed;
    }
    assert.ok(dir.startsWith(join(tmpdir(), 'history-sharing-')));
    await rm(dir, { recursive: true, force: true });
  }
});
