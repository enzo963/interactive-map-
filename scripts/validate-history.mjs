import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { chromium, firefox, webkit, devices } from 'playwright';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.env.HB_HISTORY_OUT || '.validation/p7');
await mkdir(output, { recursive: true });
const headerFile = await readFile(join(root, 'dist/_headers'), 'utf8');
const headers = Object.fromEntries(headerFile.split('\n').map((line) => /^  ([^:]+): (.*)$/.exec(line)).filter(Boolean).map(([, key, value]) => [key, value.trim()]));
const server = await preview({ root, configFile: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, headers } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const chrome = process.env.HB_CHROME_EXECUTABLE ? { executablePath: process.env.HB_CHROME_EXECUTABLE } : { channel: 'chrome' };
const projects = [
  { name: 'chrome', browser: chromium, launch: chrome },
  { name: 'edge', browser: chromium, launch: { channel: 'msedge' } },
  { name: 'firefox', browser: firefox, launch: process.env.HB_FIREFOX_EXECUTABLE ? { executablePath: process.env.HB_FIREFOX_EXECUTABLE } : {} },
  { name: 'webkit', browser: webkit },
  { name: 'android-emulated', browser: chromium, launch: chrome, device: devices['Pixel 7'] },
  { name: 'iphone-emulated', browser: webkit, device: devices['iPhone 13'] },
];
const requested = process.env.HB_HISTORY_BROWSERS?.split(',');
const selectedProjects = projects.filter((project) => !requested || requested.includes(project.name));
assert.ok(selectedProjects.length, 'Select at least one recognized browser profile.');
const report = { date: new Date().toISOString(), browsers: [], limits: ['Mobile profiles are emulation; WebKit is not retail Safari.', 'Local production build; public hosting remains unconfigured.'] };
try {
  for (const project of selectedProjects) {
    const result = { name: project.name, checks: [], errors: [] };
    report.browsers.push(result);
    const browser = await project.browser.launch({ ...project.launch, headless: true });
    result.version = browser.version();
    const context = await browser.newContext({ ...(project.device || { viewport: { width: 1440, height: 1000 } }), reducedMotion: 'reduce' });
    await context.exposeFunction('__historyCsp', (directive) => result.errors.push(`CSP: ${directive}`));
    await context.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => window.__historyCsp(event.effectiveDirective)));
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', (error) => result.errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().startsWith(base) && response.status() >= 400) result.errors.push(`${response.status()} ${response.url()}`);
    });
    const check = (value, label) => { assert.ok(value, `${project.name}: ${label}`); result.checks.push(label); };
    async function cardsReady(count) {
      await page.waitForFunction((expected) => document.querySelectorAll('main .hb-card__link').length === expected, count);
      return true;
    }
    async function visit(path, heading) {
      await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction((expected) => document.querySelector('main h1')?.textContent === expected, heading);
      check(await page.locator('main h1').textContent() === heading, `${path} heading`);
      check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), `${path} overflow`);
      check(await page.locator('main h1').count() === 1, `${path} one main heading`);
    }
    try {
      await visit('/timeline', 'Heritage Timeline');
      const assyrian = page.locator('.hb-history__eras button[data-era="assyrian"]');
      await assyrian.focus(); await assyrian.press('Enter');
      await page.waitForFunction(() => new URLSearchParams(location.search).get('era') === 'assyrian');
      check(await cardsReady(4), 'keyboard selects four approved Assyrian records');
      const emblemPath = await assyrian.locator('svg[data-era="assyrian"] path:last-child').getAttribute('d');
      check(await page.locator('main .hb-card svg[data-era="assyrian"] path:last-child').evaluateAll((nodes, expected) => nodes.length > 0 && nodes.every((node) => node.getAttribute('d') === expected), emblemPath), 'timeline and cards reuse identical civilization geometry');
      check(await assyrian.locator('svg').getAttribute('aria-hidden') === 'true', 'emblem is decorative beside a named keyboard control');
      await page.locator('.hb-history__period select').selectOption('Assyrian and Parthian');
      check(await cardsReady(1), 'exact recorded period filters intersect era');
      check(await page.locator('main .hb-card .hb-period-emblems svg').count() === 2, 'multi-period card retains both civilization emblems');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !new URLSearchParams(location.search).has('period'));
      check(await cardsReady(4), 'Back restores era results');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('.hb-history__eras button[aria-pressed="true"]').waitFor();
      check(await page.locator('.hb-history__eras button[aria-pressed="true"]').getAttribute('data-era') === 'assyrian', 'refresh preserves era selection');
      await page.locator('.hb-history__eras button[data-era="unplaced"]').click();
      check(await cardsReady(11), 'all eleven unplaced approved records remain accessible');
      await visit('/civilizations', 'Civilizations & Eras');
      check(await page.locator('.hb-history__tiles h3 svg').count() === 12, 'every civilization tile has its shared emblem');
      await page.locator('main a[href="/civilizations/islamic"]').click();
      await page.waitForFunction(() => location.pathname === '/civilizations/islamic' && document.querySelector('main h1')?.textContent === 'Islamic');
      check(await cardsReady(6), 'Islamic view includes six approved Abbasid records');
      check(await page.locator('main h1 svg[data-era="islamic"]').count() === 1, 'dedicated era heading carries the shared emblem');
      await page.locator('.hb-search input').fill('no-such-historical-site');
      await page.locator('.hb-state').waitFor();
      await page.getByRole('button', { name: 'Reset history filters', exact: true }).click();
      check(await cardsReady(6), 'no-results reset recovers era cards');
      await visit('/civilizations/sasanian', 'Sasanian');
      check(await page.locator('main .hb-card__link').count() === 0 && await page.getByRole('heading', { name: 'No approved records for this era yet', exact: true }).isVisible(), 'Sasanian empty state excludes research candidates');
      await visit('/civilizations/not-real', 'Page not found');
      await visit('/timeline?era=not-real', 'Heritage Timeline');
      await page.getByRole('button', { name: 'Reset history filters', exact: true }).click();
      await page.locator('.hb-history__eras button[data-era="all"][aria-pressed="true"]').waitFor();
      check(await page.locator('main .hb-card__link').count() === 24, 'invalid timeline era resets to approved cards');
      if (project.name === 'chrome') {
        for (const width of [320, 768, 1280, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          for (const [path, title] of [['/timeline', 'Heritage Timeline'], ['/civilizations', 'Civilizations & Eras'], ['/civilizations/ottoman', 'Ottoman']]) await visit(path, title);
        }
      }
      await visit('/timeline?era=assyrian', 'Heritage Timeline');
      await page.locator('.hb-lang__select').selectOption('de');
      await page.waitForFunction(() => document.documentElement.lang === 'de');
      check(await page.locator('main h1').textContent() === 'Zeitleiste des Kulturerbes', 'German timeline heading');
      check((await page.locator('#history-results [role="status"]').first().textContent()).includes('freigegebene Einträge'), 'German result plurals');
      await page.locator('.hb-theme').click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('main h1')).color === getComputedStyle(document.body).color);
      await page.waitForFunction(() => [...document.querySelectorAll('.hb-civilization-emblem')].every((node) => getComputedStyle(node).stroke === getComputedStyle(node.parentElement).color));
      check(true, 'all emblem strokes settle to their surrounding theme text color');
      await page.locator('#history-results-title').scrollIntoViewIfNeeded();
      check(await page.locator('.hb-card').evaluateAll((cards) => cards.every((card) => {
        const row = card.querySelector('.hb-card__period');
        if (!row) return true;
        const bounds = card.getBoundingClientRect();
        return [...row.querySelectorAll('svg, .hb-card__period-text')].every((node) => {
          const item = node.getBoundingClientRect();
          return item.width > 0 && item.left >= bounds.left - 1 && item.right <= bounds.right + 1;
        });
      })), 'card emblems and text fit inside compact card frames');
      check(await page.locator('#history-results-title svg').evaluate((node) => getComputedStyle(node).stroke === getComputedStyle(node.parentElement).color), 'emblems inherit readable theme text color');
      await page.screenshot({ path: join(output, `${project.name}.png`), fullPage: false });
      check(result.errors.length === 0, 'no local HTTP, runtime or CSP errors');
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed'; result.failure = error.stack;
      await page.screenshot({ path: join(output, `${project.name}-failure.png`) }).catch(() => {});
    } finally { await context.close(); await browser.close(); }
    console.log(`${result.name} ${result.version}: ${result.status}, ${result.checks.length} checks`);
  }
  if (report.browsers.some((result) => result.status !== 'passed')) process.exitCode = 1;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await new Promise((resolve) => { server.httpServer.close(resolve); server.httpServer.closeAllConnections(); });
}
