import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile, access, unlink, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, firefox, webkit, devices } from 'playwright';
import { preview } from 'vite';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, process.env.HB_AUDIT_DIST || 'dist');
const output = resolve(process.env.HB_AUDIT_OUT || join(root, '.validation/p6-31-32'));
await mkdir(output, { recursive: true });
const buildDigest = createHash('sha256');
for (const file of (await readdir(dist, { recursive: true })).sort()) {
  if ((await stat(join(dist, file))).isFile()) buildDigest.update(`${file.replaceAll('\\', '/')}\0`).update(await readFile(join(dist, file))).update('\0');
}
const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8'));
const records = JSON.parse(await readFile(join(root, 'src/data/sites.json'), 'utf8')).filter((site) => site.status === 'approved');
const headerFile = await readFile(join(dist, '_headers'), 'utf8');
const headers = Object.fromEntries(headerFile.split('\n').map((line) => /^  ([^:]+): (.*)$/.exec(line)).filter(Boolean).map(([, key, value]) => [key, value.trim()]));
const modelEntry = manifest['node_modules/@google/model-viewer/lib/model-viewer.js'].file;
const cacheEntry = manifest['node_modules/@google/model-viewer/lib/three-components/CachingGLTFLoader.js'].file;

// Original, synthetic triangle: exercises the actual built renderer, never heritage data.
function triangleGlb() {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0', generator: 'History in Cards validation fixture' }, scene: 0,
    scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.2, 0.5, 0.3, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    buffers: [{ byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36, target: 34962 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1, -1, 0], max: [1, 1, 0] }] }));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const binary = Buffer.from(new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]).buffer);
  const glb = Buffer.alloc(12 + 8 + padded.length + 8 + binary.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20);
  const offset = 20 + padded.length;
  glb.writeUInt32LE(binary.length, offset); glb.writeUInt32LE(0x004e4942, offset + 4); binary.copy(glb, offset + 8);
  return glb;
}
const attempts = new Map();
const fixtureScript = `import '/${modelEntry}';
import { CachingGLTFLoader } from '/${cacheEntry}';
window.fixtureState='idle';
const url='/__validation/retry.glb'+location.search;
function mount(){const old=document.querySelector('model-viewer');const model=document.createElement('model-viewer');model.style.cssText='width:300px;height:300px';model.setAttribute('camera-controls','');model.addEventListener('load',()=>window.fixtureState='loaded');model.addEventListener('error',()=>{CachingGLTFLoader.delete(url).catch(()=>{});window.fixtureState='error';});if(old)old.replaceWith(model);else document.body.append(model);window.fixtureState='loading';model.src=url;}
document.querySelector('#load').onclick=mount;
document.querySelector('#retry').onclick=async()=>{await CachingGLTFLoader.delete(url).catch(()=>{});mount();};
window.fixtureReady=true;`;
const fixtureHtml = '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg"><title>Synthetic 3D validation fixture</title></head><body><h1>Synthetic 3D validation fixture</h1><button id="load">Load fixture</button><button id="retry">Retry fixture</button><script type="module" src="/__validation/model.mjs"></script></body></html>';
const server = await preview({ root, configFile: false, logLevel: 'error', build: { outDir: dist }, preview: { host: '127.0.0.1', port: 0, headers } });
// These fixtures exist only in this local validation server; nothing is added to dist.
server.middlewares.stack.unshift({ route: '/__validation', handle(req, res, next) {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  const url = new URL(req.url, 'http://fixture.invalid');
  if (url.pathname === '/model.html') { res.setHeader('Content-Type', 'text/html'); return res.end(fixtureHtml); }
  if (url.pathname === '/model.mjs') { res.setHeader('Content-Type', 'text/javascript'); return res.end(fixtureScript); }
  if (url.pathname === '/retry.glb') {
    const count = (attempts.get(url.search) || 0) + 1; attempts.set(url.search, count);
    if (count === 1) { res.statusCode = 404; return res.end('Expected synthetic first-load failure'); }
    res.setHeader('Content-Type', 'model/gltf-binary'); return res.end(triangleGlb());
  }
  return next();
} });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const report = { date: new Date().toISOString(), buildSha256: buildDigest.digest('hex'), buildDirectory: dist, headersAppliedLocally: headers, http: [], browsers: [], limits: ['Mobile profiles are emulation, not physical Android/iOS devices.', 'Playwright Firefox/WebKit are automation builds; WebKit on Windows is not retail Safari.', 'The public deployment/domain is not configured.'] };

async function chromeExecutable() {
  if (process.env.HB_CHROME_EXECUTABLE) return process.env.HB_CHROME_EXECUTABLE;
  if (!process.env.LOCALAPPDATA) return undefined;
  const cache = join(process.env.LOCALAPPDATA, 'HistoryInCards/browser-tests');
  let folders;
  try { folders = await readdir(cache); } catch { return undefined; }
  for (const folder of folders.filter((item) => item.startsWith('chrome-')).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))) {
    const file = join(cache, folder, 'chrome-win64/chrome.exe');
    try { await access(file); return file; } catch { /* Try another cached version. */ }
  }
}

async function httpValidation() {
  const entries = await readdir(dist, { recursive: true });
  const checkedAssets = new Set();
  const assetResponse = async (path) => {
    if (checkedAssets.has(path)) return;
    const asset = await fetch(`${base}${path}`);
    assert.equal(asset.status, 200, path);
    if (/\.(js|css)$/.test(path)) assert.match(asset.headers.get('content-type'), /javascript|text\/css/, path);
    checkedAssets.add(path);
  };
  for (const file of entries.filter((name) => name.endsWith('.html'))) {
    const path = file === 'index.html' ? '/' : `/${file.replaceAll('\\', '/').replace(/\.html$/, '')}`;
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, path);
    const dom = new JSDOM(await response.text());
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelectorAll('title').length, 1, path);
      assert.equal(doc.querySelectorAll('meta[property="og:title"]').length, 1, path);
      assert.ok(doc.querySelector('script[type="module"][src]'), path);
      for (const node of doc.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="modulepreload"]')) {
        const url = new URL(node.getAttribute('src') || node.getAttribute('href'), base);
        if (url.origin !== base) continue;
        await assetResponse(url.pathname);
      }
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      report.http.push({ path, status: response.status });
    } finally { dom.window.close(); }
  }
  for (const module of Object.values(manifest)) {
    for (const file of [module.file, ...(module.css || []), ...(module.assets || [])]) await assetResponse(`/${file}`);
  }
  report.localAssets = [...checkedAssets];
  for (const route of ['/social-card.png', '/theme-init.js', '/robots.txt', '/favicon.svg']) assert.equal((await fetch(`${base}${route}`)).status, 200, route);
  console.log(`HTTP: ${report.http.length} generated routes and ${checkedAssets.size} local assets passed`);
}

const executablePath = await chromeExecutable();
const chromeOptions = executablePath ? { executablePath } : { channel: 'chrome' };
const projects = [
  { name: 'chrome', browser: chromium, launch: chromeOptions, viewport: { width: 1440, height: 1000 }, allSites: true },
  { name: 'edge', browser: chromium, launch: { channel: 'msedge' }, viewport: { width: 1440, height: 1000 } },
  { name: 'firefox', browser: firefox, launch: process.env.HB_FIREFOX_EXECUTABLE ? { executablePath: process.env.HB_FIREFOX_EXECUTABLE } : {}, viewport: { width: 1440, height: 1000 } },
  { name: 'webkit', browser: webkit, viewport: { width: 1440, height: 1000 } },
  { name: 'android-chrome-emulated', browser: chromium, launch: chromeOptions, device: devices['Pixel 7'] },
  { name: 'iphone-webkit-emulated', browser: webkit, device: devices['iPhone 13'] },
];
const requested = process.env.HB_AUDIT_BROWSERS?.split(',');

async function browserValidation(project) {
  const result = { name: project.name, version: '', checks: [], errors: [], externalFailures: [], expectedModelFailures: [], model: '', screenshots: [] };
  report.browsers.push(result);
  let browser;
  let context;
  let page;
  let expected404Seen = false;
  const expectedConsoleKinds = new Set();
  const pendingConsole = new Set();
  const fixtureModelUrl = `${base}/__validation/retry.glb?run=${project.name}`;
  const visitedScripts = new Set();
  const check = (condition, message) => { assert.ok(condition, `${project.name}: ${message}`); result.checks.push(message); };
  try {
    console.log(`Browser: ${project.name} starting`);
    await unlink(join(output, `${project.name}-failure.png`)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    browser = await project.browser.launch({ ...project.launch, headless: true });
    result.version = browser.version();
    context = await browser.newContext({ ...(project.device || { viewport: project.viewport }), locale: 'en-US', colorScheme: 'light', reducedMotion: 'reduce' });
    await context.exposeFunction('__validationReportCsp', (entry) => result.errors.push({ kind: 'csp', ...entry }));
    await context.addInitScript(() => {
      window.__validationCsp = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        const entry = { directive: event.effectiveDirective, url: event.blockedURI, document: location.href };
        window.__validationCsp.push(entry);
        window.__validationReportCsp(entry).catch(() => {});
      });
    });
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', (error) => result.errors.push({ kind: 'runtime', message: error.message }));
    const captureConsole = async (message) => {
      if (message.type() !== 'error') return;
      const details = await Promise.all(message.args().map((arg) => arg.evaluate((value) => value instanceof Error ? `${value.message}\n${value.stack}` : '').catch(() => '')));
      const text = [message.text(), ...details.filter(Boolean)].join('\n');
      const url = message.location().url || text.match(/source:\s*(https?:\/\/[^\s"\]]+)/)?.[1] || '';
      const kind = /Failed to load resource:.*404/.test(text) ? 'resource' : /fetch for .*responded with 404/.test(text) ? 'loader' : '';
      if (expected404Seen && kind && !expectedConsoleKinds.has(kind) && (url === fixtureModelUrl || text.includes(fixtureModelUrl))) {
        expectedConsoleKinds.add(kind); result.expectedModelFailures.push(text); return;
      }
      const entry = { kind: 'console', message: text, url };
      if (url && !url.startsWith(base)) result.externalFailures.push(entry); else result.errors.push(entry);
    };
    page.on('console', (message) => {
      const task = captureConsole(message).catch((error) => result.errors.push({ kind: 'audit-console', message: error.message }));
      pendingConsole.add(task); task.finally(() => pendingConsole.delete(task));
    });
    page.on('response', (response) => {
      const url = response.url();
      if (response.request().resourceType() === 'script') visitedScripts.add(url);
      if (response.status() < 400) return;
      if (url === fixtureModelUrl && response.status() === 404 && !expected404Seen && attempts.get(`?run=${project.name}`) === 1) {
        expected404Seen = true; result.expectedModelFailures.push({ kind: 'first-load-http', url, status: 404 }); return;
      }
      const entry = { kind: 'http', url, status: response.status() };
      if (url.startsWith(base) && response.request().resourceType() !== 'document') result.errors.push(entry);
      else if (!url.startsWith(base)) result.externalFailures.push(entry);
    });
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText || '';
      if (/ABORTED|NS_BINDING_ABORTED|cancelled/i.test(failure)) return;
      const entry = { kind: 'network', url: request.url(), message: failure };
      if (request.url().startsWith(base)) result.errors.push(entry); else result.externalFailures.push(entry);
    });
    async function navigate(path) {
      await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => document.querySelector('main h1') && !document.querySelector('.hb-route-loading'));
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]));
      const state = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, csp: window.__validationCsp, headings: document.querySelectorAll('main h1').length, title: document.title, og: document.querySelector('meta[property="og:title"]')?.content }));
      check(!state.overflow, `no horizontal overflow: ${path}`);
      check(state.headings === 1 && state.title === state.og, `route renders with current metadata: ${path}`);
      check(state.csp.length === 0, `CSP: ${path}`);
    }
    for (const path of ['/', '/explore', '/map?region=nineveh', '/decks', '/decks/baghdad', '/unesco', '/decks/unesco', '/3d-archive', '/decks/3d', '/about', '/methodology', '/our-work', '/contact', '/sites/hatra', '/sites/abbasid-palace', '/sites/not-a-site', '/decks/not-a-deck', '/not-a-page', '/map?region=missing']) await navigate(path);
    if (project.allSites) for (const site of records) await navigate(`/sites/${encodeURIComponent(site.slug)}`);
    check(![...visitedScripts].some((url) => /model-viewer|CachingGLTFLoader|three-renderer/.test(url)), 'ordinary routes do not request 3D renderer chunks');

    // P6-34: a connected visitor journey uses only the controls visible to visitors.
    // Deep-link coverage above is complementary; no page.goto shortcuts inside this journey.
    async function waitForRoute(path) {
      await page.waitForFunction((expected) => location.pathname === expected && document.querySelector('main h1') && !document.querySelector('.hb-route-loading'), path);
    }
    async function footerLink(path) {
      await page.locator(`.hb-footer a[href="${path}"]`).first().click();
      await waitForRoute(path);
    }
    await navigate('/');
    await page.locator('#global-heritage-search').fill('Abbasid Palace');
    await page.locator('#global-heritage-search').press('Enter');
    await page.waitForURL((url) => url.pathname === '/explore' && url.searchParams.get('q') === 'Abbasid Palace', { waitUntil: 'domcontentloaded' });
    await page.locator('.hb-grid .hb-card__link[href="/sites/abbasid-palace"]').waitFor();
    check(true, 'journey: Home search reaches matching archive cards');
    if (await page.locator('.hb-explore__toggle').isVisible()) await page.locator('.hb-explore__toggle').click();
    await page.locator('#explore-filters').getByRole('checkbox', { name: /^Baghdad/ }).check();
    await page.waitForFunction(() => new URLSearchParams(location.search).get('gov')?.includes('baghdad'));
    if (await page.locator('.hb-filters__done').isVisible()) await page.locator('.hb-filters__done').click();
    check(await page.locator('.hb-grid .hb-card__link[href="/sites/abbasid-palace"]').isVisible(), 'journey: governorate filter retains the matching card');
    await page.locator('.hb-explore__context a').click();
    await waitForRoute('/map');
    const mapQuery = new URL(page.url()).searchParams;
    check(mapQuery.get('q') === 'Abbasid Palace' && mapQuery.get('gov') === 'baghdad' && mapQuery.get('region') === 'baghdad', 'journey: map preserves the search and filter URL state');
    await page.getByRole('button', { name: 'Show all governorates', exact: true }).click();
    const baghdad = page.locator('.hb-regions').getByRole('button', { name: /^Baghdad,/ });
    await baghdad.click();
    await page.waitForFunction(() => new URLSearchParams(location.search).get('region') === 'baghdad');
    check(await baghdad.getAttribute('aria-pressed') === 'true', 'journey: governorate selection updates the map');
    await page.locator('.hb-mapx__list').getByRole('button', { name: /^Abbasid Palace/ }).click();
    await page.waitForFunction(() => new URLSearchParams(location.search).get('site') === 'abbasid-palace');
    await page.locator('.hb-mapx__selected .hb-card__link').click();
    await waitForRoute('/sites/abbasid-palace');
    check(await page.locator('main h1').textContent() === 'Abbasid Palace', 'journey: selected map card opens its details');
    check(await page.getByRole('heading', { name: 'Site information', exact: true }).isVisible(), 'journey: details expose site information');
    await page.locator('.hb-sectionnav a[href="#gallery"]').click();
    const galleryButton = page.locator('.hb-gallery button').first();
    if (project.device) await galleryButton.tap(); else await galleryButton.click();
    await page.locator('.hb-lightbox[open]').waitFor();
    check((await page.locator('.hb-lightbox').textContent()).includes('Mohammed Qays'), 'journey: gallery viewer includes image attribution');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.hb-lightbox')?.open);
    check(await galleryButton.evaluate((node) => document.activeElement === node), 'gallery Escape restores opener focus');
    await page.locator('.hb-sectionnav a[href="#sources"]').click();
    const source = page.locator('#sources .hb-sources a').first();
    check(await source.isVisible() && /^https:\/\//.test(await source.getAttribute('href')), 'journey: Sources exposes a usable provenance link');
    check(await source.getAttribute('target') === '_blank' && (await source.getAttribute('rel')).includes('noopener'), 'source links open a protected new tab');
    await page.locator('.hb-sectionnav a[href="#model"]').click();
    check(await page.getByRole('heading', { name: '3D resource unavailable', exact: true }).isVisible(), 'journey: 3D section honestly reports an unavailable resource');
    check(await page.locator('#model model-viewer, #model iframe, #model button').count() === 0, 'unavailable 3D has no fake viewer or load control');
    await footerLink('/decks');
    await page.locator('.hb-tile__link[href="/decks/baghdad"]').click();
    await waitForRoute('/decks/baghdad');
    const deckCard = page.locator('.hb-grid .hb-card__link[href="/sites/abbasid-palace"]');
    while (await deckCard.count() === 0 && await page.locator('.hb-grid__more button').isVisible()) {
      const before = await page.locator('.hb-grid .hb-card__link').count();
      await page.locator('.hb-grid__more button').click();
      await page.waitForFunction((count) => document.querySelectorAll('.hb-grid .hb-card__link').length > count, before);
    }
    check(await deckCard.count() > 0, 'journey: Decks opens the matching governorate collection');
    await footerLink('/about');
    check(await page.locator('main h1').textContent() === 'About History in Cards', 'journey: About explains the project');
    await footerLink('/our-work');
    check(await page.locator('main h1').textContent() === 'Our Work', 'journey: Our Work is reachable from the connected visitor journey');
    result.journey = 'Home → Search → Filter → Map → Governorate → Card → Details → Gallery → Sources → unavailable 3D → Decks → About → Our Work';

    // Back and empty-results recovery remain separate release-blocker checks.
    await navigate('/explore?q=Hatra');
    await page.locator('.hb-grid .hb-card__link[href="/sites/hatra"]').click();
    await waitForRoute('/sites/hatra');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => location.pathname === '/explore' && new URLSearchParams(location.search).get('q') === 'Hatra');
    await page.locator('.hb-grid .hb-card__link').first().waitFor();
    check(await page.locator('.hb-grid .hb-card__link').count() > 0, 'browser Back restores filtered results');
    await page.locator('.hb-search input').fill('no-such-heritage-place');
    await page.locator('.hb-state').getByRole('button', { name: 'Clear search', exact: true }).click();
    await page.locator('.hb-grid .hb-card__link').first().waitFor();
    check(await page.locator('.hb-grid .hb-card__link').count() > 0, 'no-results recovery restores cards');

    await navigate('/sites/abbasid-palace');
    // WebKit can briefly retain an inherited color after toggles or locale remounts.
    // Wait for computed-style agreement, not elapsed time, before checks or screenshots.
    async function waitForInheritedTheme(expectedBodyColor) {
      await page.waitForFunction((expected) => {
        const bodyColor = getComputedStyle(document.body).color;
        const selectors = ['main h1', '.hb-crumbs a', '.hb-project-menu > summary'];
        return bodyColor === expected && selectors.every((selector) => {
          const node = document.querySelector(selector);
          return node && getComputedStyle(node).color === bodyColor;
        });
      }, expectedBodyColor);
    }
    const themeBefore = await page.locator('html').getAttribute('data-theme');
    const bodyColorBefore = await page.locator('body').evaluate((node) => getComputedStyle(node).color);
    await page.locator('.hb-theme').click();
    await page.waitForFunction((before) => getComputedStyle(document.body).color !== before, bodyColorBefore);
    const expectedBodyColor = await page.locator('body').evaluate((node) => getComputedStyle(node).color);
    await waitForInheritedTheme(expectedBodyColor);
    check(await page.locator('html').getAttribute('data-theme') !== themeBefore, 'theme toggle updates body and inherited text colors');
    await page.locator('.hb-lang__select').selectOption('de');
    await page.waitForFunction(() => document.documentElement.lang === 'de');
    await waitForInheritedTheme(expectedBodyColor);
    check(await page.locator('meta[property="og:locale"]').getAttribute('content') === 'de_DE', 'German UI and metadata');
    await page.locator('.hb-lang__select').selectOption('en');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    await waitForInheritedTheme(expectedBodyColor);
    check(true, 'theme colors settle on title, breadcrumb and header menu after locale remount');
    const shot = `${project.name}-site.png`;
    await page.screenshot({ path: join(output, shot), fullPage: false }); result.screenshots.push(shot);
    if (await page.locator('.hb-header__toggle').isVisible()) {
      if (project.device) await page.locator('.hb-header__toggle').tap(); else await page.locator('.hb-header__toggle').click();
      check(await page.locator('.hb-header__toggle').getAttribute('aria-expanded') === 'true', 'mobile navigation opens');
      if (project.device) {
        await page.locator('#primary-nav .hb-project-menu > summary').tap();
        await page.locator('#primary-nav a[href="/about"]').tap();
        await page.waitForFunction(() => location.pathname === '/about' && document.querySelector('main h1')?.textContent === 'About History in Cards');
        check(await page.locator('.hb-header__toggle').getAttribute('aria-expanded') === 'false', 'touch navigation opens About and dismisses menu');
        await page.locator('.hb-header__toggle').tap();
      }
      await page.keyboard.press('Escape');
      check(await page.locator('.hb-header__toggle').getAttribute('aria-expanded') === 'false', 'mobile navigation closes with Escape');
    }
    await navigate('/map?region=nineveh');
    const hatra = page.locator('.hb-pin-wrap[aria-label^="Hatra,"]');
    await hatra.focus(); await hatra.press('Enter');
    await page.waitForFunction(() => new URLSearchParams(location.search).get('site') === 'hatra');
    check(await page.locator('.hb-mapx__selected .hb-card__title').textContent() === 'Hatra', 'map pin keyboard selection');
    check(await page.locator('.leaflet-control-attribution a[href="https://www.openstreetmap.org/copyright"]').isVisible(), 'map attribution visible');

    // Real built library + real cache adapter. The first 404 is intentional and must recover.
    await page.goto(`${base}/__validation/model.html?run=${project.name}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.fixtureReady);
    const webgl = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl2')));
    if (!webgl) result.model = 'Not exercised: this headless browser has no WebGL2 context';
    else {
      await page.locator('#load').click();
      await page.waitForFunction(() => window.fixtureState === 'error');
      await page.locator('#retry').click();
      await page.waitForFunction(() => window.fixtureState === 'loaded', null, { timeout: 20000 });
      result.model = 'Synthetic GLB failed once, cache eviction and retry loaded successfully';
      check(attempts.get(`?run=${project.name}`) >= 2, '3D retry makes a fresh request through the shared cache adapter');
    }
    check((await page.evaluate(() => window.__validationCsp)).length === 0, '3D fixture CSP compatibility');
    await Promise.all([...pendingConsole]);
    check(result.errors.length === 0, 'no unexpected console, local asset or runtime errors');
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.failure = error.stack; result.failureUrl = page?.url();
    if (page) await page.screenshot({ path: join(output, `${project.name}-failure.png`) }).catch(() => {});
  } finally {
    await context?.close(); await browser?.close();
    console.log(`Browser: ${project.name} ${result.version || '(unavailable)'} ${result.status}; ${result.checks.length} checks`);
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
}

try {
  await httpValidation();
  const selected = projects.filter((project) => !requested || requested.includes(project.name));
  assert.ok(selected.length, 'Select at least one recognized browser');
  // Two isolated contexts at a time keep software rendering and remote assets manageable.
  for (let index = 0; index < selected.length; index += 2) await Promise.all(selected.slice(index, index + 2).map(browserValidation));
  const failed = report.browsers.filter((browser) => browser.status !== 'passed');
  console.log(`Validation report: ${join(output, 'report.json')}`);
  if (failed.length) { console.error(failed.map((browser) => `${browser.name}: ${browser.failure}`).join('\n')); process.exitCode = 1; }
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await new Promise((resolve, reject) => { server.httpServer.close((error) => error ? reject(error) : resolve()); server.httpServer.closeAllConnections(); });
}
