import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';

// Measure the entry's static dependency graph, excluding on-demand import() chunks.
const root = resolve(process.argv[2] || 'dist');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const entries = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => resolve(root, `.${match[1]}`));
const files = new Map();
function visit(file) {
  if (files.has(file)) return;
  const body = readFileSync(file);
  files.set(file, { file: file.slice(root.length + 1).replaceAll('\\', '/'), bytes: statSync(file).size, gzipBytes: gzipSync(body).length });
  if (!file.endsWith('.js')) return;
  for (const match of body.toString().matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+\.(?:js|css))["']/g)) visit(resolve(dirname(file), match[1]));
}
entries.forEach(visit);
const sum = (extension, key) => [...files.values()].filter((file) => file.file.endsWith(extension)).reduce((total, file) => total + file[key], 0);
const result = { staticFiles: [...files.values()], staticShellJSBytes: sum('.js', 'bytes'), staticShellJSGzipBytes: sum('.js', 'gzipBytes'), staticShellCSSBytes: sum('.css', 'bytes'), staticShellCSSGzipBytes: sum('.css', 'gzipBytes') };
const route = process.argv[3];
if (route) {
  const manifestPath = resolve(root, '.vite/manifest.json');
  if (!existsSync(manifestPath)) throw new Error('Route measurement requires build.manifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const routeKey = Object.keys(manifest).find((key) => key.endsWith(`/pages/${route}.jsx`));
  if (!routeKey) throw new Error(`Unknown route module: ${route}`);
  const seen = new Set();
  function addModule(key) {
    if (seen.has(key)) return;
    seen.add(key);
    const module = manifest[key];
    visit(resolve(root, module.file));
    for (const css of module.css ?? []) visit(resolve(root, css));
    for (const imported of module.imports ?? []) addModule(imported);
  }
  addModule(routeKey);
  result.route = route;
  result.initialRouteJSBytes = sum('.js', 'bytes');
  result.initialRouteJSGzipBytes = sum('.js', 'gzipBytes');
  result.initialRouteCSSBytes = sum('.css', 'bytes');
  result.initialRouteJSRequests = [...files.values()].filter((file) => file.file.endsWith('.js')).length;
}
console.log(JSON.stringify(result, null, 2));
