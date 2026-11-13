import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Dev-only API that writes map edits straight into src/data/sites.json.
 *   POST  /api/sites        -> add a new card (body: raw site fields)
 *   PATCH /api/sites/:id    -> set the map position (latitude/longitude) of an existing card
 * Vite then hot-reloads the JSON, so the map updates on its own.
 * Not part of the production build: `apply: 'serve'`.
 */
const SITES_FILE = fileURLToPath(new URL('../src/data/sites.json', import.meta.url));

const slugify = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const EDITABLE = ['name', 'governorate', 'latitude', 'longitude', 'category', 'period', 'description'];

function clean(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body must be an object');
  const out = {};
  for (const key of EDITABLE) {
    if (!(key in body)) continue;
    let value = body[key];
    if (key === 'latitude' || key === 'longitude') {
      value = value === '' || value === null ? null : Number(value);
      if (value !== null && !Number.isFinite(value)) throw new Error(`${key} must be a number`);
      const limit = key === 'latitude' ? 90 : 180;
      if (value !== null && Math.abs(value) > limit) throw new Error(`${key} is out of range`);
    } else {
      value = String(value ?? '').trim();
    }
    out[key] = value;
  }
  if (out.latitude != null) out.latitude = Number(out.latitude.toFixed(5));
  if (out.longitude != null) out.longitude = Number(out.longitude.toFixed(5));
  return out;
}

// Coordinates set with the map editor are marked so reviewers can tell them from sourced ones.
const placedNote = () => ({ coordinates_source: 'map-editor', coordinates_placed_at: new Date().toISOString().slice(0, 10) });

/**
 * A draft record in the shape of src/data/sites.schema.json. It stays hidden (status draft) until it
 * meets the visible card contract: a reliable source, a concise description and the other required fields.
 */
function newSite(fields, sites) {
  if (!fields.name) throw new Error('name is required');
  if (fields.latitude == null || fields.longitude == null) throw new Error('a map position is required');

  const base = slugify(fields.name) || 'site';
  let slug = base;
  for (let n = 2; sites.some((s) => s.slug === slug); n += 1) slug = `${base}-${n}`;
  const governorate = slugify(fields.governorate) || 'unknown';
  let id = `site-${governorate}-${slug}`;
  for (let n = 2; sites.some((s) => s.id === id); n += 1) id = `site-${governorate}-${slug}-${n}`;

  return {
    id,
    name: fields.name,
    governorate: fields.governorate ?? '',
    category: fields.category ?? '',
    period: fields.period ?? '',
    ...(fields.period ? {} : { period_status: 'not-established' }),
    description: fields.description ?? '',
    unesco: null,
    has3D: null,
    coverImage: null,
    galleryImages: [],
    image_status: 'none',
    sources: [],
    unesco_status: 'unknown',
    status: 'draft',
    verification_status: 'draft',
    slug,
    latitude: fields.latitude,
    longitude: fields.longitude,
    ...placedNote(),
  };
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      if (tooLarge) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1e6) {
        tooLarge = true;
        data = '';
        reject(Object.assign(new Error('body too large'), { status: 413 }));
      } else data += chunk;
    });
    req.on('end', () => { if (!tooLarge) { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('invalid JSON')); } } });
    req.on('error', reject);
  });

const send = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const loopback = (host) => host === 'localhost' || host === '[::1]' || host === '::1'
  || /^127\./.test(host) || /^::ffff:127\./i.test(host);

/** Local editing is a browser-only, same-origin operation; never trust forwarded headers. */
function localOrigin(req) {
  if (!loopback(req.socket?.remoteAddress ?? '')) return false;
  try {
    const expected = new URL(`http://${req.headers.host}`);
    return loopback(expected.hostname) && !expected.username && !expected.password
      && req.headers.origin === expected.origin;
  } catch { return false; }
}

export default function sitesApi() {
  return {
    name: 'heritage-sites-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/sites', async (req, res, next) => {
        if (!['POST', 'PATCH'].includes(req.method)) return next();
        if (!localOrigin(req)) return send(res, 403, { error: 'local same-origin editing required' });
        if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) return send(res, 415, { error: 'application/json required' });
        try {
          const id = decodeURIComponent((req.url ?? '/').replace(/^\/+|\/+$/g, ''));
          if (!(req.method === 'POST' && !id) && !(req.method === 'PATCH' && id)) return next();
          const fields = clean(await readBody(req));
          const sites = JSON.parse(await readFile(SITES_FILE, 'utf8'));
          let site;
          if (req.method === 'POST') {
            site = newSite(fields, sites);
            sites.push(site);
          } else {
            site = sites.find((s) => String(s.id) === id);
            if (!site) return send(res, 404, { error: `no card with id ${id}` });
            // Only the pin moves; the reviewed record itself is left alone.
            if (fields.latitude == null || fields.longitude == null) return send(res, 400, { error: 'a map position is required' });
            Object.assign(site, { latitude: fields.latitude, longitude: fields.longitude }, placedNote());
          }
          await writeFile(SITES_FILE, `${JSON.stringify(sites, null, 2)}\n`);
          return send(res, req.method === 'POST' ? 201 : 200, site);
        } catch (error) {
          return send(res, error.status ?? 400, { error: error.status === undefined && error.code ? 'unable to save local record' : error.message });
        }
      });
    },
  };
}
