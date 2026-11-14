import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build, preview } from 'vite';
import { chromium, firefox, webkit, devices } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.env.HB_FEATURE_OUT || '.validation/map-viewer');
const source = join(output, 'source');
const fixtureOut = join(output, 'fixture-build');
await mkdir(source, { recursive: true });
assert.ok(fixtureOut.startsWith(join(root, '.validation')), 'Fixture must stay outside public deployment files.');
await writeFile(join(source, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Local viewer validation</title></head><body><div id="root"></div><script type="module" src="./fixture.jsx"></script></body></html>');
await writeFile(join(source, 'fixture.jsx'), `import React from 'react';
import {createRoot} from 'react-dom/client';
import ModelViewer from '/src/components/site/ModelViewer.jsx';
import MapCanvas from '/src/components/map/MapCanvas.jsx';
import L from '/src/lib/leaflet.js';
import '/src/styles/global.css';
import '/src/styles/pages.css';
const resource={url:'/__viewer/triangle.glb'+location.search,siteId:'synthetic-validation',verified:true,title:'Original validation triangle (not heritage data)',credit:'Original validation fixture'};
const points=Array.from({length:20},(_,i)=>({id:'validation-point-'+i,name:'Synthetic point '+i,latitude:35.5872,longitude:42.7185,governorate:'Nineveh',cardType:{tier:0,shortLabel:'Unclassified'}}));
L.Map.addInitHook(function(){window.__fixtureMap=this;});
function Fixture(){const [selected,setSelected]=React.useState(null);return <main id="main" className="hb-container"><h1>Local viewer and clustering validation</h1><h2>Twenty overlapping synthetic points, not heritage records</h2><button onClick={()=>setSelected(points[0])}>Select overlapping test marker</button><MapCanvas allSites={points} visibleSites={points} selectedSite={selected} onSelect={setSelected} size="compact"/><ModelViewer resource={resource} siteId="synthetic-validation" name="Synthetic triangle" /></main>}
createRoot(document.getElementById('root')).render(<Fixture/>);`);
// Build the actual React component into a separate local fixture, never into dist or heritage data.
await build({ root, base: '/__viewer/', publicDir: false, logLevel: 'error', build: { outDir: fixtureOut, emptyOutDir: false, rolldownOptions: { input: join(source, 'index.html') } } });
const fixtureFiles = new Map();
let fixtureHtml;
for (const file of await readdir(fixtureOut, { recursive: true })) {
  if (!(await stat(join(fixtureOut, file))).isFile()) continue;
  const bytes = await readFile(join(fixtureOut, file));
  if (file.endsWith('.html')) fixtureHtml = bytes;
  else fixtureFiles.set(file.replaceAll('\\', '/'), bytes);
}
assert.ok(fixtureHtml, 'Viewer fixture HTML was built.');
const digest = createHash('sha256');
for (const file of (await readdir(join(root, 'dist'), { recursive: true })).sort()) {
  if ((await stat(join(root, 'dist', file))).isFile()) digest.update(file.replaceAll('\\', '/') + '\0').update(await readFile(join(root, 'dist', file))).update('\0');
}
function triangleGlb() {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0', generator: 'Original History in Cards test geometry' }, scene: 0,
    scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [.2, .5, .3, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    buffers: [{ byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36, target: 34962 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1, -1, 0], max: [1, 1, 0] }] }));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const binary = Buffer.from(new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]).buffer);
  const data = Buffer.alloc(28 + padded.length + binary.length);
  data.writeUInt32LE(0x46546c67, 0); data.writeUInt32LE(2, 4); data.writeUInt32LE(data.length, 8);
  data.writeUInt32LE(padded.length, 12); data.writeUInt32LE(0x4e4f534a, 16); padded.copy(data, 20);
  data.writeUInt32LE(binary.length, 20 + padded.length); data.writeUInt32LE(0x004e4942, 24 + padded.length); binary.copy(data, 28 + padded.length);
  return data;
}
const headerFile = await readFile(join(root, 'dist/_headers'), 'utf8');
const headers = Object.fromEntries(headerFile.split('\n').map((line) => /^  ([^:]+): (.*)$/.exec(line)).filter(Boolean).map(([, key, value]) => [key, value.trim()]));
const server = await preview({ root, configFile: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, headers } });
const attempts = new Map();
server.middlewares.stack.unshift({ route: '/__viewer', handle(req, res) {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  const url = new URL(req.url, 'http://fixture.invalid');
  if (url.pathname === '/model.html') { res.setHeader('Content-Type', 'text/html'); res.end(fixtureHtml); return; }
  if (url.pathname === '/triangle.glb') {
    const count = (attempts.get(url.search) || 0) + 1; attempts.set(url.search, count);
    if (count === 1) { res.statusCode = 404; res.end('Expected first model failure'); return; }
    res.setHeader('Content-Type', 'model/gltf-binary'); res.end(triangleGlb()); return;
  }
  const file = url.pathname.slice(1);
  if (!fixtureFiles.has(file)) { res.statusCode = 404; res.end('Missing fixture asset'); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');
  res.end(fixtureFiles.get(file));
} });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const chrome = process.env.HB_CHROME_EXECUTABLE ? { executablePath: process.env.HB_CHROME_EXECUTABLE } : { channel: 'chrome' };
const projects = [
  { name: 'chrome', engine: chromium, launch: chrome },
  { name: 'edge', engine: chromium, launch: { channel: 'msedge' } },
  { name: 'firefox', engine: firefox, launch: process.env.HB_FIREFOX_EXECUTABLE ? { executablePath: process.env.HB_FIREFOX_EXECUTABLE } : {} },
  { name: 'webkit', engine: webkit },
  { name: 'android-emulated', engine: chromium, launch: chrome, device: devices['Pixel 7'] },
  { name: 'iphone-emulated', engine: webkit, device: devices['iPhone 13'] },
];
const requested = process.env.HB_FEATURE_BROWSERS?.split(',');
const report = { date: new Date().toISOString(), buildSha256: digest.digest('hex'), browsers: [], limits: ['Mobile profiles are emulation; Windows WebKit is not retail Safari.', 'The model is original synthetic test geometry. The archive currently has no verified 3D models.', 'Hosting and domain remain unconfigured.'] };
try {
  for (const project of projects.filter((item) => !requested || requested.includes(item.name))) {
    const result = { name: project.name, checks: [], errors: [], consoleErrors: [] };
    report.browsers.push(result);
    let browser;
    let context;
    let page;
    const check = (value, label) => { assert.ok(value, `${project.name}: ${label}`); result.checks.push(label); };
    try {
      browser = await project.engine.launch({ ...project.launch, headless: true }); result.version = browser.version();
      context = await browser.newContext({ ...(project.device || { viewport: { width: 1440, height: 1000 } }), reducedMotion: 'reduce' });
      await context.exposeFunction('__featureCsp', (directive) => result.errors.push(`CSP: ${directive}`));
      await context.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => window.__featureCsp(event.effectiveDirective)));
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', (error) => result.errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
      page.on('response', (response) => {
        if (response.url().startsWith(base) && response.status() >= 400 && !(response.url().includes('/__viewer/triangle.glb') && response.status() === 404 && attempts.get(`?browser=${project.name}`) === 1)) result.errors.push(`${response.status()} ${response.url()}`);
      });
      async function visit(path) {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' });
        await page.locator('.hb-map-tools').waitFor();
        await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
        check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), `map fits viewport: ${path}`);
      }
      await visit('/map');
      await page.locator('.hb-cluster-wrap').first().waitFor();
      check(/nearby sites/.test(await page.locator('.hb-cluster-wrap').first().getAttribute('title') || ''), 'clusters have meaningful accessible names');
      const beforeMarkers = await page.locator('.leaflet-marker-pane').innerHTML();
      await page.locator('.hb-cluster-wrap').first().focus(); await page.keyboard.press('Enter');
      await page.waitForFunction((before) => document.querySelector('.leaflet-marker-pane').innerHTML !== before, beforeMarkers);
      check(true, 'keyboard activation expands a geographic group');
      const mapId = await page.locator('.hb-mapx__leaflet').evaluate((node) => node._leaflet_id);
      await page.getByLabel('Group nearby markers', { exact: true }).uncheck();
      await page.locator('.hb-mapx__leaflet[data-clustered="false"]').waitFor();
      check(await page.locator('.hb-mapx__leaflet').evaluate((node) => node._leaflet_id) === mapId, 'ungrouped toggle preserves map instance');
      check(await page.locator('.hb-cluster-wrap').count() === 0, 'ungrouped map has individual markers');
      await page.getByLabel('Group nearby markers', { exact: true }).check();
      await page.locator('.hb-mapx__leaflet[data-clustered="true"]').waitFor();
      check(await page.locator('.leaflet-control-attribution a[href="https://www.openstreetmap.org/copyright"]').isVisible(), 'modern map attribution remains visible');
      await page.getByRole('button', { name: 'Historical exploration', exact: true }).click();
      await page.locator('.hb-map-tools__history select').selectOption('assyrian');
      await page.waitForFunction(() => document.querySelectorAll('.hb-mapx__item').length === 4);
      check(await page.locator('.hb-mapx__leaflet').getAttribute('data-map-mode') === 'history', 'historical mode retains map and shows four approved Assyrian records');
      await page.locator('.hb-map-tools input[value="3d"]').check();
      await page.getByRole('heading', { name: 'No cards match these filters', exact: true }).waitFor();
      check(await page.locator('.hb-mapx__item').count() === 0, 'unavailable 3D layer stays honestly empty');
      await page.locator('.hb-map-tools input[value="archaeological"]').check();
      await page.waitForFunction(() => document.querySelectorAll('.hb-mapx__item').length > 0);
      check(new URL(page.url()).searchParams.getAll('layer').length === 2, 'layer union and era survive in URL');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('.hb-map-tools').waitFor();
      check(await page.locator('.hb-map-tools input[value="archaeological"]').isChecked(), 'reload restores layer selections');
      await page.getByRole('button', { name: 'Modern map', exact: true }).click();
      check(await page.locator('.hb-mapx__leaflet').getAttribute('data-map-mode') === 'modern', 'modern mode remains available');
      await page.getByRole('button', { name: 'Reset map layers and mode', exact: true }).click();
      if (project.name === 'chrome') for (const width of [320, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 1000 }); await visit('/map?view=history&era=ottoman'); }
      await page.locator('.hb-map-tools').screenshot({ path: join(output, `${project.name}-layers.png`) });
      await page.goto(`${base}/__viewer/model.html?browser=${project.name}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Load 3D viewer', exact: true }).waitFor();
      await page.locator('.hb-cluster-wrap').first().waitFor();
      check((await page.locator('.hb-cluster').first().textContent()) === '20', 'twenty identical-coordinate points form one readable group');
      await page.getByRole('button', { name: 'Select overlapping test marker', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('.leaflet-marker-pane .hb-pin-wrap').length === 20);
      check(true, 'selecting a coincident site separates all overlapping markers');
      check(await page.locator('model-viewer').count() === 0, 'viewer remains opt-in before activation');
      const webgl = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl2')));
      if (!webgl) result.model = 'Not exercised: no WebGL2 in this headless profile';
      else {
        await page.getByRole('button', { name: 'Load 3D viewer', exact: true }).click();
        await page.getByRole('button', { name: 'Retry viewer', exact: true }).waitFor();
        check(await page.getByRole('link', { name: /^Download GLB model/ }).isVisible(), 'model error preserves download fallback');
        await page.getByRole('button', { name: 'Retry viewer', exact: true }).click();
        await page.locator('.hb-model[data-state="ready"]').waitFor({ timeout: 30000 });
        const initial = await page.locator('model-viewer').evaluate((node) => ({ theta: node.getCameraOrbit().theta, phi: node.getCameraOrbit().phi, radius: node.getCameraOrbit().radius }));
        await page.getByRole('button', { name: 'Rotate right', exact: true }).click();
        await page.waitForFunction((before) => Math.abs(document.querySelector('model-viewer').getCameraOrbit().theta - before) > .05, initial.theta);
        check(true, 'orbit button changes actual renderer camera');
        await page.locator('.hb-model').getByRole('button', { name: 'Zoom in', exact: true }).click();
        await page.waitForFunction((before) => document.querySelector('model-viewer').getCameraOrbit().radius < before, initial.radius);
        check(true, 'zoom button changes actual renderer distance');
        await page.getByRole('button', { name: 'Reset view', exact: true }).click();
        await page.waitForFunction((before) => { const now = document.querySelector('model-viewer').getCameraOrbit(); return Math.abs(now.theta - before.theta) < .001 && Math.abs(now.radius - before.radius) < .001; }, initial);
        check(true, 'reset restores loaded camera view');
        await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
        await page.waitForFunction(() => document.fullscreenElement || document.querySelector('.hb-model--expanded'));
        result.fullscreen = await page.evaluate(() => document.fullscreenElement ? 'native' : 'expanded fallback');
        await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
        await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('.hb-model--expanded'));
        check(true, 'fullscreen opens and exits');
        await page.evaluate(() => { document.querySelector('.hb-model').requestFullscreen = undefined; });
        await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
        await page.locator('.hb-model--expanded[role="dialog"]').waitFor();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('.hb-model--expanded'));
        check(await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).evaluate((node) => document.activeElement === node), 'unsupported fullscreen fallback restores focus with Escape');
        await page.getByText('Model information', { exact: true }).click();
        check((await page.locator('.hb-model__information').textContent()).includes('GLB'), 'model information shows actual format');
        check(attempts.get(`?browser=${project.name}`) >= 2, 'real GLB retry makes a fresh request');
        result.model = 'Actual React viewer and renderer exercised with original GLB fixture';
        await page.locator('.hb-model').screenshot({ path: join(output, `${project.name}-viewer.png`) });
      }
      check(result.errors.length === 0, 'no unexpected local HTTP, runtime or CSP errors');
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed'; result.failure = error.stack; result.url = page?.url();
      result.fixtureMap = await page?.evaluate(() => { const map = window.__fixtureMap; if (!map) return null; let group; map.eachLayer((layer) => { if (layer.getVisibleParent) group = layer; }); const marker = group?.getLayers()[0]; const parent = marker && group.getVisibleParent(marker); return { zoom: map.getZoom(), maxZoom: map.getMaxZoom(), visibleMarkers: document.querySelectorAll('.leaflet-marker-pane .hb-pin-wrap').length, parentCount: parent?.getChildCount?.(), markerOnMap: marker && map.hasLayer(marker) }; }).catch(() => null);
      await page?.screenshot({ path: join(output, `${project.name}-failure.png`) }).catch(() => {});
    } finally { await context?.close(); await browser?.close(); }
    console.log(`${result.name} ${result.version || ''}: ${result.status}; ${result.checks.length} checks`);
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
  assert.ok(report.browsers.length, 'Select at least one recognized profile.');
  if (report.browsers.some((result) => result.status !== 'passed')) process.exitCode = 1;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await new Promise((resolve) => { server.httpServer.close(resolve); server.httpServer.closeAllConnections(); });
}
