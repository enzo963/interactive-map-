import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalizeGovernorate } from '../src/data/governorates.js';
import { normalizeCategory } from '../src/data/categories.js';

/**
 * Dev-only API that writes map edits straight into src/data/sites.json.
 *   POST   /api/sites        -> add a new card (body: raw site fields)
 *   PATCH  /api/sites/:id    -> set the map position (latitude/longitude) of an existing card
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
  const out = {};
  for (const key of EDITABLE) {
    if (!(key in body)) continue;
    let value = body[key];
    if (key === 'latitude' || key === 'longitude') {
      value = value === '' || value === null ? null : Number(value);
      if (value !== null && !Number.isFinite(value)) throw new Error(`${key} must be a number`);
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
  // Controlled values are stored in their canonical spelling ("Ninewa" → "Nineveh", "mosques" → "Mosque").
  const governorateName = normalizeGovernorate(fields.governorate) ?? fields.governorate ?? '';
  const category = normalizeCategory(fields.category) ?? fields.category ?? '';
  const governorate = slugify(governorateName) || 'unknown';
  let id = `site-${governorate}-${slug}`;
  for (let n = 2; sites.some((s) => s.id === id); n += 1) id = `site-${governorate}-${slug}-${n}`;

  return {
    id,
    name: fields.name,
    governorate: governorateName,
    category,
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
    req.on('data', (chunk) => { data += chunk; if (data.length > 1e6) reject(new Error('body too large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('invalid JSON')); } });
    req.on('error', reject);
  });

const send = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

export default function sitesApi() {
  return {
    name: 'heritage-sites-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/sites', async (req, res, next) => {
        const id = decodeURIComponent((req.url ?? '/').replace(/^\/+|\/+$/g, ''));
        if (!(req.method === 'POST' && !id) && !(req.method === 'PATCH' && id)) return next();
        try {
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
          return send(res, 400, { error: error.message });
        }
      });
    },
  };
}