import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Dev-only API that writes map edits straight into src/data/sites.json.
 *   POST  /api/sites        -> add a new card (body: raw site fields)
 *   PATCH /api/sites/:id    -> update fields of an existing card (e.g. latitude/longitude)
 * Vite then hot-reloads the JSON, so the map updates on its own.
 * Not part of the production build: `apply: 'serve'`.
 */
const SITES_FILE = fileURLToPath(new URL('../src/data/sites.json', import.meta.url));

const slugify = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const EDITABLE = [
  'name', 'governorate', 'city', 'latitude', 'longitude', 'site_type', 'historical_period',
  'civilization', 'estimated_year', 'short_description', 'full_description', 'heritage_status',
];

function clean(body) {
  const out = {};
  for (const key of EDITABLE) {
    if (!(key in body)) continue;
    let value = body[key];
    if (['latitude', 'longitude', 'estimated_year'].includes(key)) {
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

function newSite(fields, sites) {
  if (!fields.name) throw new Error('name is required');
  if (fields.latitude == null || fields.longitude == null) throw new Error('a map position is required');

  const maxId = sites.reduce((max, s) => Math.max(max, Number(String(s.id).replace(/\D/g, '')) || 0), 0);
  const base = slugify(fields.name) || `site-${maxId + 1}`;
  let slug = base;
  for (let n = 2; sites.some((s) => s.slug === slug); n += 1) slug = `${base}-${n}`;
  const governorateDeck = slugify(fields.governorate);

  return {
    id: `site-${String(maxId + 1).padStart(3, '0')}`,
    slug,
    name: fields.name,
    governorate: fields.governorate ?? '',
    city: fields.city ?? '',
    latitude: fields.latitude,
    longitude: fields.longitude,
    site_type: fields.site_type ?? '',
    historical_period: fields.historical_period ?? '',
    civilization: fields.civilization ?? '',
    estimated_year: fields.estimated_year ?? null,
    short_description: fields.short_description ?? '',
    full_description: '',
    main_image: '',
    gallery: [],
    decks: governorateDeck ? [governorateDeck] : [],
    unesco_status: '',
    heritage_status: fields.heritage_status || 'existing',
    has_3d: false,
    model_3d_url: '',
    has_video: false,
    video_url: '',
    our_work: false,
    our_work_types: [],
    sources: [],
    verification_status: 'needs-review',
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
            Object.assign(site, fields);
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
