// Governorate and site type are controlled values: records store one canonical spelling, variants resolve
// to it, and every card appears under exactly its own governorate and type filters.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { GOVERNORATE_NAMES, getGovernorateKey, normalizeGovernorate } = await server.ssrLoadModule('/src/data/governorates.js');
const { CATEGORIES, normalizeCategory } = await server.ssrLoadModule('/src/data/categories.js');
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { applyFilters, getFacets, EMPTY_FILTERS } = await server.ssrLoadModule('/src/utils/filterSites.js');
const { getHeritageCategories } = await server.ssrLoadModule('/src/utils/heritageCategories.js');
const { normalizeSites } = await server.ssrLoadModule('/src/utils/siteAdapter.js');
const slugify = (await server.ssrLoadModule('/src/utils/slugify.js')).default;
after(async () => { await server.close(); });

const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const sites = getAllSites();

test('governorate spellings, accents, articles, suffixes and Arabic or Kurdish names resolve to one governorate', () => {
  const cases = {
    nineveh: ['Nineveh', 'Ninewa', 'NINAWA', 'Nīnawā', 'Ninawa Governorate', 'Nineveh Province', 'نينوى', 'محافظة نينوى'],
    erbil: ['Erbil', 'Arbil', 'Irbil', 'Hawler', 'Hewlêr', 'أربيل', 'اربيل', 'هەولێر'],
    sulaymaniyah: ['Sulaymaniyah', 'Sulaimaniyah', 'Slemani', 'Sulaymaniyyah', 'السليمانية'],
    duhok: ['Duhok', 'Dohuk', 'Dahuk', 'دهوك'],
    kirkuk: ['Kirkuk', 'Kerkuk', "Al-Ta'mim", 'كركوك'],
    salahaldin: ['Salah al-Din', 'Salah ad-Din', 'Salahuddin', 'Saladin', 'صلاح الدين'],
    diyala: ['Diyala', 'Diala', 'ديالى'],
    baghdad: ['Baghdad', 'Bagdad', 'بغداد'],
    anbar: ['Anbar', 'Al-Anbar', 'al anbar', 'الأنبار'],
  };
  for (const [key, names] of Object.entries(cases)) {
    for (const name of names) {
      assert.equal(getGovernorateKey(name), key, name);
      assert.equal(normalizeGovernorate(name), GOVERNORATE_NAMES[key], name);
    }
  }
  assert.equal(normalizeGovernorate('Atlantis'), null);
  assert.equal(normalizeGovernorate(''), null);
});

test('site-type variants resolve to one controlled type; unknown types are not guessed', () => {
  assert.equal(normalizeCategory('Mosque and Minaret'), 'Mosque');
  assert.equal(normalizeCategory('mosques'), 'Mosque');
  assert.equal(normalizeCategory('  historic   city '), 'Historic Town');
  assert.equal(normalizeCategory('archaeological-tell'), 'Archaeological Site');
  assert.equal(normalizeCategory('Churches'), 'Church');
  assert.equal(normalizeCategory('Spaceport'), null);
  for (const category of CATEGORIES) assert.equal(normalizeCategory(category), category);
});

test('every record stores the canonical governorate and a controlled site type', () => {
  const offending = records.filter((record) => normalizeGovernorate(record.governorate) !== record.governorate
    || !CATEGORIES.includes(record.category));
  assert.deepEqual(offending.map((record) => `${record.id}: ${record.governorate} / ${record.category}`), []);
});

test('every controlled site type belongs to at least one browsing category', () => {
  const orphaned = CATEGORIES.filter((category) => getHeritageCategories({ siteType: category }).length === 0);
  assert.deepEqual(orphaned, []);
});

test('the filters offer each governorate and type once, and each card appears under its own', () => {
  const facets = getFacets(sites, EMPTY_FILTERS);
  const govLabels = facets.governorates.map((option) => option.label ?? option.name ?? option.id);
  assert.equal(new Set(facets.governorates.map((option) => option.id)).size, facets.governorates.length);
  assert.ok(facets.governorates.every((option) => Object.hasOwn(GOVERNORATE_NAMES, option.id)), `unexpected governorate options: ${govLabels}`);
  assert.ok(facets.kinds.every((option) => CATEGORIES.some((category) => slugify(category) === option.id)), 'every type option is a controlled type');

  let total = 0;
  for (const option of facets.governorates) {
    const shown = applyFilters(sites, { ...EMPTY_FILTERS, governorates: [option.id] });
    assert.ok(shown.every((site) => getGovernorateKey(site.governorate) === option.id));
    total += shown.length;
  }
  assert.equal(total, sites.length, 'the governorate filters together show every card exactly once');

  const missing = sites.filter((site) => {
    const byGov = applyFilters(sites, { ...EMPTY_FILTERS, governorates: [getGovernorateKey(site.governorate)] });
    const byType = applyFilters(sites, { ...EMPTY_FILTERS, kinds: [slugify(site.siteType)] });
    return !byGov.includes(site) || !byType.includes(site);
  });
  assert.deepEqual(missing.map((site) => site.id), []);
});

test('a record written with a variant shows under the canonical governorate and type', () => {
  const [site] = normalizeSites([{ id: 'x', name: 'Test Mosque', governorate: 'Ninewa', category: 'Mosque and Minaret', description: 'x' }]);
  assert.equal(site.governorate, 'Nineveh');
  assert.equal(site.siteType, 'Mosque');
  const mixed = normalizeSites([
    { id: 'a', name: 'A', governorate: 'Nineveh', category: 'Mosque' },
    { id: 'b', name: 'B', governorate: 'Ninawa Governorate', category: 'mosques' },
  ]);
  const facets = getFacets(mixed, EMPTY_FILTERS);
  assert.equal(facets.governorates.length, 1);
  assert.equal(facets.kinds.length, 1);
});
