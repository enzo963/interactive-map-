import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build, preview } from 'vite';
import { chromium, firefox, webkit, devices } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.env.HB_DIGITAL_OUT || '.validation/digital-heritage');
assert.ok(output.startsWith(join(root, '.validation')), 'Fixtures remain outside deployment files.');
const source = join(output, 'source'); const fixtureOut = join(output, 'fixture-build');
await mkdir(source, { recursive: true });
await writeFile(join(source, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Digital heritage validation fixture</title></head><body><div id="root"></div><script type="module" src="./fixture.jsx"></script></body></html>');
await writeFile(join(source, 'fixture.jsx'), `import React from 'react';import {createRoot} from 'react-dom/client';
import App from '/src/App.jsx';import {getAllSites} from '/src/services/siteService.js';import {normalizeSites} from '/src/utils/siteAdapter.js';import '/src/styles/global.css';
const siteId='synthetic-digital-site';
const image=(src,label)=>({src,alt:label,caption:'Original test graphic, not a heritage photograph',credit:'Original validation artwork',license:'CC0',siteId,license_status:'verified',sourceUrl:'https://example.org/test-graphics',license_review:{permission:'publication-permitted',license:'CC0',reviewedBy:'Validation fixture',reviewedAt:'2026-11-05',image_url:src,evidence:[{evidenceId:'test-graphics',image_url:src,source_url:'https://example.org/test-graphics'}]},license_tracking:{evidence_valid:true,evidence_checks:[{valid:true,source:{evidenceId:'test-graphics',url:'https://example.org/test-graphics'}}]},publication_approval:{status:'approved',siteId,site_verified:true,image_url:src,reviewedBy:'Validation fixture',reviewedAt:'2026-11-05'}});
const raw={id:siteId,name:'Synthetic documentation fixture',status:'approved',governorate:'Erbil',category:'Building',period:'Modern',description:'Synthetic interface validation record, not a real heritage site.',alternativeNames:['Validation alias'],sources:[],coverImage:null,galleryImages:[image('/__digital/a.svg','Original graphic A'),image('/__digital/b.svg','Original graphic B')],digital_assets:[{id:'synthetic-model-a',type:'3d',title:'Validation exterior model',url:'/__digital/model.glb',creator:'Research team',creationMethod:'Photogrammetry',year:2026,format:'GLB',fileSizeBytes:1024,verification_status:'verified',sourceName:'Validation source',sourceUrl:'https://example.org/synthetic-model'},{id:'synthetic-model-b',type:'3d',title:'Validation interior model',url:'/__digital/model.obj',creator:'Archive team',verification_status:'approved'},{type:'3d',title:'Unreviewed fixture model',url:'/__digital/draft.glb',verification_status:'draft'}],photogrammetry_projects:[{id:'synthetic-survey',siteId,title:'Validation photogrammetry project',verification_status:'verified',our_work:true,status:'completed',creator:'Validation team',method:'Photogrammetry',year:2026,modelUrls:['/__digital/model.glb'],photographUrls:['/__digital/a.svg','/__digital/b.svg'],documentation:[{title:'Validation documentation',url:'https://example.org/validation',siteId,verification_status:'verified'}],reconstruction:{description:'Original test interpretation, not historical research.',evidence:'Synthetic interface evidence.',uncertainties:'Test-only uncertainty statement.'}}],comparisons:[{id:'synthetic-pair',title:'Original test graphic comparison',type:'historical-current',siteId,verification_status:'verified',before:{image:'/__digital/a.svg',label:'Graphic A',date:null},after:{image:'/__digital/b.svg',label:'Graphic B',date:null},notes:'Original test graphics; no historical chronology is asserted.'}]};
const claim={siteId,verification_status:'verified',reviewedBy:'Synthetic QA reviewer',reviewedAt:'2026-11-05',sourceRefs:['synthetic-story-source']};
raw.sources=[{sourceName:'Synthetic evidence reference for interface tests',url:'https://whc.unesco.org/en/list/208/',evidenceId:'synthetic-story-source',accessedAt:'2026-11-05',accessLevel:'full-text'}];
raw.coverImage=image('/__digital/a.svg','Original test graphic, not a heritage photograph');
raw.preservation={...claim,state:'restored',asOf:'2026-11-01',summary:'Synthetic restored condition for interface testing.'};
raw.story_sections=[{...claim,id:'architecture',type:'architecture',text:'Synthetic architecture narrative, not historical research.'},{...claim,id:'draft-story',type:'significance',verification_status:'draft',text:'PRIVATE DRAFT STORY'}];
raw.historical_events=[{...claim,id:'restore',type:'restoration',title:'Synthetic restoration event',year:2020},{...claim,id:'loss',type:'destruction',title:'Synthetic destruction event',year:2015},{...claim,id:'build',type:'construction',title:'Synthetic approximate early construction',year:-500,endYear:-400,precision:'approximate'},{...claim,id:'draft-event',type:'excavation',title:'PRIVATE DRAFT EVENT',year:1900,verified:false}];
raw.heritage_media=[...['photograph','archival-image','reconstruction','panorama'].map((type,index)=>({...image('/__digital/'+['d','a','b','c'][index]+'.svg','Original '+type+' test graphic'),...claim,id:'typed-'+type,type,title:'Synthetic '+type,date:type==='archival-image'?'c. 1920':null,description:'Original interface test drawing, not historical media.'})),{...claim,id:'typed-video',type:'video',title:'Synthetic video resource',url:'/__digital/video.mp4'},{...claim,id:'typed-model',type:'3d',title:'Synthetic model resource',url:'/__digital/model.glb',date:'2020',description:'Synthetic model evidence text.'},{...image('/__digital/a.svg','Unreviewed archival type'),...claim,id:'draft-archive',type:'archival-image',title:'PRIVATE ARCHIVE DRAFT',verification_status:'draft'}];
const entries=normalizeSites([raw,{id:'exact-search-fixture',name:'Validation alias',status:'approved',governorate:'Erbil',category:'Building',period:'Modern',description:'Synthetic exact-name search ranking record.'},...Array.from({length:8},(_,index)=>({id:'suggestion-'+index,name:'Suggestion test '+index,status:'approved',governorate:'Erbil',category:'Building',period:'Modern',description:'Synthetic autocomplete record.'})),{id:'synthetic-draft',name:'Unapproved fixture site',status:'needs-review',digital_assets:[{type:'3d',url:'/__digital/unapproved.glb',verification_status:'verified'}]}]);
const cache=getAllSites();cache.splice(0,cache.length,...entries);history.replaceState(null,'','/3d-archive');
createRoot(document.getElementById('root')).render(<><aside role="note">Local QA only: synthetic model, project and image data.</aside><App/></>);`);
await build({ root, base: '/__digital/', publicDir: false, logLevel: 'error', build: { outDir: fixtureOut, emptyOutDir: false, rolldownOptions: { input: join(source, 'index.html') } } });
const assets = new Map(); let html;
for (const path of await readdir(fixtureOut, { recursive: true })) {
  if (!(await stat(join(fixtureOut, path))).isFile()) continue;
  const bytes = await readFile(join(fixtureOut, path));
  if (path.endsWith('.html')) html = bytes; else assets.set(path.replaceAll('\\', '/'), bytes);
}
assert.ok(html);
const headerText = await readFile(join(root, 'dist/_headers'), 'utf8');
const headers = Object.fromEntries(headerText.split('\n').map((line) => /^  ([^:]+): (.*)$/.exec(line)).filter(Boolean).map(([, key, value]) => [key, value.trim()]));
const server = await preview({ root, configFile: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, headers } });
const graphic = (color, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${color}"/><rect x="160" y="120" width="480" height="360" rx="20" fill="none" stroke="#f1ede4" stroke-width="12"/><text x="400" y="320" fill="#f1ede4" text-anchor="middle" font-size="40">${label}</text></svg>`;
let modelRequests = 0;
server.middlewares.stack.unshift({ route: '/__digital', handle(req, res) {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  const path = new URL(req.url, 'http://fixture.invalid').pathname;
  if (path === '/fixture.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
  if (/^\/[abcd]\.svg$/.test(path)) { res.setHeader('Content-Type', 'image/svg+xml'); res.end(graphic(path === '/a.svg' ? '#35665d' : '#a8482a', `Original test graphic ${path[1].toUpperCase()}`)); return; }
  if (/\.(glb|obj)$/.test(path)) modelRequests += 1;
  const asset = path.slice(1);
  if (!assets.has(asset)) { res.statusCode = 404; res.end('Missing local test asset'); return; }
  res.setHeader('Content-Type', asset.endsWith('.js') ? 'text/javascript' : asset.endsWith('.css') ? 'text/css' : 'application/octet-stream'); res.end(assets.get(asset));
} });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const hash = createHash('sha256');
for (const path of (await readdir(join(root, 'dist'), { recursive: true })).sort()) if ((await stat(join(root, 'dist', path))).isFile()) hash.update(path.replaceAll('\\', '/') + '\0').update(await readFile(join(root, 'dist', path))).update('\0');
const chrome = process.env.HB_CHROME_EXECUTABLE ? { executablePath: process.env.HB_CHROME_EXECUTABLE } : { channel: 'chrome' };
const projects = [
  { name: 'chrome', engine: chromium, launch: chrome }, { name: 'edge', engine: chromium, launch: { channel: 'msedge' } },
  { name: 'firefox', engine: firefox, launch: process.env.HB_FIREFOX_EXECUTABLE ? { executablePath: process.env.HB_FIREFOX_EXECUTABLE } : {} },
  { name: 'webkit', engine: webkit }, { name: 'android-emulated', engine: chromium, launch: chrome, device: devices['Pixel 7'] },
  { name: 'iphone-emulated', engine: webkit, device: devices['iPhone 13'] },
];
const requested = process.env.HB_DIGITAL_BROWSERS?.split(',');
const report = { date: new Date().toISOString(), buildSha256: hash.digest('hex'), browsers: [], limits: ['Populated cases use isolated synthetic records and original test graphics, never the production dataset.', 'Mobile profiles are emulation and Windows WebKit is not retail Safari.', 'Public hosting/domain remain unconfigured.'] };
try {
  for (const project of projects.filter((item) => !requested || requested.includes(item.name))) {
    const result = { name: project.name, checks: [], errors: [] }; report.browsers.push(result);
    let browser; let context; let page;
    const check = (value, label) => { assert.ok(value, `${project.name}: ${label}`); result.checks.push(label); };
    try {
      browser = await project.engine.launch({ ...project.launch, headless: true }); result.version = browser.version();
      context = await browser.newContext({ ...(project.device || { viewport: { width: 1440, height: 1000 } }), reducedMotion: 'reduce', locale: 'en-US' });
      await context.exposeFunction('__digitalCsp', (directive) => result.errors.push(`CSP: ${directive}`));
      await context.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => window.__digitalCsp(event.effectiveDirective)));
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', (error) => result.errors.push(error.message));
      page.on('response', (response) => { if (response.url().startsWith(base) && response.status() >= 400) result.errors.push(`${response.status()} ${response.url()}`); });
      async function heading(title) { await page.waitForFunction((text) => document.querySelector('main h1')?.textContent === text, title); }
      async function fits(label) { await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1); check(true, label); }
      for (const path of ['/3d-archive', '/decks/3d']) {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await heading('3D Model Library');
        check(await page.getByRole('heading', { name: 'No verified 3D resources yet', exact: true }).isVisible(), `${path} honest empty library`);
      }
      for (const path of ['/disappeared-heritage', '/decks/lost']) {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await heading('Disappeared Heritage');
        check(await page.getByRole('heading', { name: 'No reviewed loss records yet', exact: true }).isVisible(), `${path} honest reviewed-loss empty state`);
      }
      await page.goto(base + '/image-archive', { waitUntil: 'domcontentloaded' }); await heading('Historical Image Archive');
      check(await page.getByRole('heading', { name: 'No verified archival photographs yet', exact: true }).isVisible(), 'archival collection remains honest without reviewed real images');
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
      await page.locator('main .hb-card').first().waitFor();
      await fits('Home fits the browser viewport after restoring card dimensions');
      const cardProportions = async () => page.locator('main .hb-card').evaluateAll((cards) => cards.every((card) => card.offsetWidth === 0 || Math.abs(card.offsetHeight-card.offsetWidth*7.4/5) < 2));
      check(await cardProportions(), 'Home cards retain their original proportions');
      await page.goto(`${base}/__digital/fixture.html`, { waitUntil: 'domcontentloaded' }); await heading('3D Model Library');
      check(await page.evaluate(() => Math.abs(innerWidth - screen.width) <= 1 || !matchMedia('(pointer: coarse)').matches), 'mobile fixture uses device viewport width');
      await page.waitForFunction(() => document.querySelectorAll('.hb-model-library__entry').length === 2);
      check(true, 'library contains two verified model entries and excludes drafts');
      const search = page.locator('.hb-model-library .hb-search input');
      await search.fill('Research GLB'); await page.waitForFunction(() => document.querySelectorAll('.hb-model-library__entry').length === 1);
      check((await page.locator('.hb-model-library__entry').textContent()).includes('Validation exterior model'), 'creator and format words search together');
      await page.getByRole('button', { name: 'Reset model filters', exact: true }).click();
      await page.getByLabel('Format', { exact: true }).selectOption('OBJ');
      await page.waitForFunction(() => document.querySelectorAll('.hb-model-library__entry').length === 1);
      check((await page.locator('.hb-model-library__entry').textContent()).includes('Validation interior model'), 'format filter selects the resource');
      await page.getByLabel('Creation method', { exact: true }).selectOption('Photogrammetry');
      await page.getByRole('heading', { name: 'No models match these filters', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Reset model filters', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('.hb-model-library__entry').length === 2);
      check(true, 'no-results reset restores all model entries');
      await page.locator('.hb-model-library__entry .hb-model__information summary').first().click();
      check((await page.locator('.hb-model-library__entry .hb-model__information').first().textContent()).includes('1,024 bytes'), 'standard metadata preserves recorded file size');
      check((await page.locator('.hb-model-library__entry .hb-model__information').first().textContent()).includes('License unknown'), 'model verification does not imply license verification');
      check(modelRequests === 0 && await page.locator('model-viewer, iframe').count() === 0, 'library does not eagerly load models or embeds');
      await fits('model library fits viewport');
      await page.locator('.hb-model-library__entry a[href="/sites/synthetic-documentation-fixture#model"]').first().click();
      await heading('Synthetic documentation fixture');
      check((await page.locator('#preservation').textContent()).includes('Synthetic restored condition'), 'site shows reviewed current condition separately from historical events');
      check((await page.locator('#story-architecture').textContent()).includes('Synthetic architecture narrative'), 'optional architecture narrative renders');
      check(await page.locator('#story-significance').count() === 0 && !(await page.locator('main').textContent()).includes('PRIVATE DRAFT'), 'unreviewed narratives and events remain unpublished');
      const chronology = await page.locator('.hb-site-events > li').allTextContents();
      check(chronology.length === 3 && chronology[0].includes('c. 500 BCE–400 BCE') && chronology[1].includes('2015') && chronology[2].includes('2020'), 'site events sort BCE ranges and later events chronologically');
      await page.locator('#story-architecture summary').click();
      check((await page.locator('#story-architecture a[href="https://whc.unesco.org/en/list/208/"]').textContent()).startsWith('Synthetic evidence reference for interface tests'), 'claim references retain readable source names');
      check(await cardProportions(), 'site card retains its original proportions');
      const photo = page.locator('.hb-site__card .hb-card__photo');
      check(await photo.locator('img').evaluate((image) => getComputedStyle(image).objectFit) === 'cover', 'card photo fills its dedicated window');
      check(await page.locator('.hb-card__photo-credit').count() === 0, 'cards omit the photographer and license strip');
      await page.locator('.hb-site__card .hb-card').screenshot({ path: join(output, `${project.name}-square-card.png`) });
      check(await page.locator('#projects').count() === 1 && await page.locator('#comparisons').count() === 1, 'site exposes reviewed projects and comparisons');
      check((await page.locator('#projects').textContent()).includes('Test-only uncertainty statement.'), 'reconstruction uncertainty remains visible');
      check(await page.locator('#projects .hb-gallery img').count() === 2, 'project links two independently approved site images');
      const range = page.getByRole('slider', { name: 'Reveal before image', exact: true });
      await range.focus(); await range.press('ArrowRight'); check(await range.inputValue() === '51', 'comparison supports native keyboard steps');
      await range.press('End'); check(await range.inputValue() === '100', 'comparison supports end position');
      await range.press('Home'); check(await range.inputValue() === '0', 'comparison supports start position');
      check((await page.locator('.hb-comparison__labels').textContent()).includes('Date not recorded'), 'unknown image dates stay unknown');
      await page.getByRole('button', { name: 'Side by side', exact: true }).click();
      await page.locator('.hb-comparison--side-by-side').waitFor();
      check(await page.getByRole('slider').count() === 0 && await page.locator('.hb-comparison img').count() === 2, 'side-by-side comparison is available without a slider');
      await page.waitForFunction(() => [...document.querySelectorAll('.hb-comparison img')].every((image) => image.complete && image.naturalWidth > 0));
      await fits('site documentation and comparisons fit viewport');
      if (project.name === 'chrome') for (const width of [320, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 1000 }); await fits(`comparison layout at ${width}px`); }
      await page.locator('.hb-comparison').screenshot({ path: join(output, `${project.name}-comparison.png`) });
      await page.locator('.hb-footer a[href="/our-work"]').first().click(); await heading('Our Work');
      check(await page.locator('section[aria-labelledby="work-photogrammetry"] a[href="/sites/synthetic-documentation-fixture#projects"]').count() === 1, 'Our Work links the reviewed owned project');
      await page.locator('.hb-footer a[href="/disappeared-heritage"]').first().click(); await heading('Disappeared Heritage');
      await page.locator('.hb-loss__entry').waitFor();
      check((await page.locator('.hb-loss__entry').textContent()).includes('Restored') && (await page.locator('.hb-loss__entry').textContent()).includes('Synthetic destruction event'), 'collection keeps restored condition alongside historical destruction');
      await page.getByLabel('Current recorded condition', { exact: true }).selectOption('destroyed');
      await page.getByRole('heading', { name: 'No heritage records match', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Reset heritage filters', exact: true }).click();
      await page.locator('.hb-loss__entry').waitFor();
      check(new URL(page.url()).search === '', 'condition-filter reset restores the collection and URL');
      await page.locator('.hb-loss .hb-search input').fill('nothing matches');
      await page.getByRole('heading', { name: 'No heritage records match', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Reset heritage filters', exact: true }).click();
      await fits('disappeared heritage fits the viewport');
      await page.locator('.hb-loss__entry').screenshot({ path: join(output, `${project.name}-loss-entry.png`) });
      await page.locator('.hb-loss__entry a[href="/sites/synthetic-documentation-fixture#preservation"]').click();
      await heading('Synthetic documentation fixture');
      check(new URL(page.url()).hash === '#preservation', 'collection links directly to site condition and evidence');
      check(await page.locator('#gallery .hb-gallery img').count() === 4, 'mixed gallery contains four explicitly identified image types');
      check(!(await page.locator('#gallery').textContent()).includes('PRIVATE ARCHIVE DRAFT'), 'unreviewed archival type stays unpublished');
      await page.locator('#gallery [data-media-type="archival-image"]').click();
      check(await page.locator('#gallery .hb-gallery img').count() === 1 && (await page.locator('#gallery').textContent()).includes('c. 1920'), 'archival gallery filter preserves authored date precision');
      await page.locator('#gallery .hb-gallery__item').click();
      await page.locator('.hb-lightbox[open]').waitFor();
      check((await page.locator('.hb-lightbox figcaption').textContent()).includes('c. 1920'), 'archival lightbox retains type, date and attribution');
      await page.keyboard.press('Escape'); await page.locator('.hb-lightbox[open]').waitFor({ state: 'hidden' });
      await page.locator('#gallery [data-media-type="video"]').click();
      check(await page.locator('#gallery video, #gallery iframe').count() === 0 && await page.getByRole('button', { name: 'Load video', exact: true }).isVisible(), 'video remains opt-in without eager downloads');
      await page.locator('#gallery [data-media-type="3d"]').click();
      check((await page.locator('#gallery').textContent()).includes('Synthetic model evidence text.'), 'typed model retains its descriptive evidence');
      await page.locator('.hb-footer a[href="/image-archive"]').first().click(); await heading('Historical Image Archive');
      check(await page.locator('.hb-archive .hb-gallery img').count() === 1, 'historical image archive contains reviewed archival media only');
      await page.locator('.hb-archive .hb-search input').fill('no archive matches');
      await page.getByRole('heading', { name: 'No archival images match', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Reset image search', exact: true }).click();
      await page.locator('.hb-archive .hb-gallery img').waitFor();
      check(new URL(page.url()).search === '', 'archival search reset restores results and URL');
      await fits('historical image archive fits the viewport');
      await page.locator('.hb-archive .hb-gallery').screenshot({ path: join(output, `${project.name}-archive.png`) });
      const globalSearch = page.locator('#global-heritage-search');
      await globalSearch.fill('Validation al');
      await page.locator('.hb-global-search [role="option"]').first().waitFor();
      await globalSearch.press('ArrowDown'); await globalSearch.press('Enter');
      check(await globalSearch.inputValue() === 'Validation alias' && new URL(page.url()).pathname === '/image-archive', 'keyboard autocomplete selects an alias without submitting prematurely');
      await globalSearch.press('Enter'); await heading('Search the archive');
      const rankedNames = await page.locator('.hb-grid .hb-card__title').allTextContents();
      check(rankedNames[0] === 'Validation alias' && rankedNames[1] === 'Synthetic documentation fixture', 'exact primary name ranks before an exact alternative name');
      const localSearch = page.locator('main .hb-search input');
      const searchViewport = page.viewportSize();
      await page.setViewportSize({ width: searchViewport.width, height: 420 });
      await localSearch.scrollIntoViewIfNeeded();
      await localSearch.fill('');
      await localSearch.focus();
      await localSearch.pressSequentially('Suggestion test');
      const options = page.locator('main .hb-autocomplete [role="option"]'); await options.first().waitFor();
      check(await options.count() === 8, 'suggestions remain bounded to eight local matches');
      await localSearch.press('ArrowUp');
      check(await page.locator('main [role="option"][aria-selected="true"]').evaluate((option) => { const a=option.getBoundingClientRect(); const b=option.parentElement.getBoundingClientRect(); return a.top>=b.top && a.bottom<=b.bottom+1; }), 'keyboard-active suggestion remains visible in its scrollable list');
      await localSearch.press('Escape'); check(await options.count() === 0, 'Escape dismisses autocomplete');
      await localSearch.fill('Suggestion tes'); await options.first().waitFor();
      if (project.device) await options.first().tap(); else await options.first().click();
      check((await localSearch.inputValue()).startsWith('Suggestion test ') && await options.count() === 0, 'pointer and mobile tap selection retain input focus and dismiss suggestions');
      await fits('search suggestions and results fit the viewport');
      check(result.errors.length === 0, 'no local HTTP, runtime or CSP errors'); result.status = 'passed';
    } catch (error) { result.status = 'failed'; result.failure = error.stack; result.url = page?.url(); result.focus = await page?.evaluate(() => ({ active: document.activeElement?.tagName, activeId: document.activeElement?.id, options: document.querySelectorAll('[role="option"]').length, scrollY, height: innerHeight })).catch(() => null); await page?.screenshot({ path: join(output, `${project.name}-failure.png`) }).catch(() => {}); }
    finally { await context?.close(); await browser?.close(); }
    console.log(`${result.name} ${result.version || ''}: ${result.status}; ${result.checks.length} checks`);
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
  assert.ok(report.browsers.length, 'Select at least one recognized browser.');
  if (report.browsers.some((result) => result.status !== 'passed')) process.exitCode = 1;
} finally { await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2)); await new Promise((resolve) => { server.httpServer.close(resolve); server.httpServer.closeAllConnections(); }); }
