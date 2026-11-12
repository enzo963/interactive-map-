import { getGovernorateKey } from '../data/governorates';
import { GOVERNORATES, SITE_TYPES, PERIODS } from '../i18n/vocabulary';

/** Spellings of each governorate that visitors type; every one must find the governorate's cards. */
export const GOVERNORATE_QUERIES = {
  nineveh: ['Nineveh', 'Ninawa', 'Ninewa', 'نينوى'],
  duhok: ['Duhok', 'Dohuk', 'Dahuk', 'دهوك'],
  erbil: ['Erbil', 'Arbil', 'Hawler', 'أربيل', 'هولير'],
  sulaymaniyah: ['Sulaymaniyah', 'Sulaimaniyah', 'Slemani', 'السليمانية'],
  kirkuk: ['Kirkuk', 'Kerkuk', 'كركوك'],
  salahaldin: ['Salah al-Din', 'Salahuddin', 'Saladin', 'صلاح الدين'],
  diyala: ['Diyala', 'ديالى'],
  baghdad: ['Baghdad', 'بغداد'],
  anbar: ['Anbar', 'Al-Anbar', 'الأنبار'],
};

const plural = (word) => (/(ch|sh|s|x)$/.test(word) ? `${word}es` : `${word}s`);
const variants = (name) => [
  name.replace(/[-‐–]/g, ' '),
  name.replace(/\b(al|el|ad|an|ar|as|ash|at|az)-/gi, ''),
  name.replace(/['’ʿʾ‘`]/g, ''),
  name.replace(/[()[\],.]/g, ' '),
  name.toLowerCase(),
].filter((variant) => variant.trim() && variant !== name);

/** The searches a visitor would type to find this published site: [{ kind, query }]. */
export function discoverabilityQueries(site) {
  const queries = [];
  const add = (kind, query) => { if (query?.trim()) queries.push({ kind, query: query.trim() }); };
  add('name', site.name);
  for (const variant of variants(site.name)) add('name variant', variant);
  for (const alias of site.alternativeNames ?? []) {
    add('alias', alias);
    for (const variant of variants(alias)) add('alias variant', variant);
  }
  const short = site.name.split(/[,(]/)[0].trim();
  const key = getGovernorateKey(site.governorate);
  for (const spelling of GOVERNORATE_QUERIES[key] ?? [site.governorate]) add('name + governorate', `${short} ${spelling}`);
  if (GOVERNORATES[key]?.ar) add('governorate (Arabic)', GOVERNORATES[key].ar);
  const category = String(site.siteType ?? '').toLowerCase();
  if (category) {
    add('category', category);
    const last = category.split(' ').at(-1);
    add('category plural', plural(last));
    const arabic = SITE_TYPES[category]?.ar ?? SITE_TYPES[last]?.ar;
    if (arabic) add('category (Arabic)', arabic);
  }
  for (const word of String(site.period ?? '').toLowerCase().match(/[a-z-]+/g) ?? []) {
    if (!PERIODS[word]) continue;
    add('period', word);
    add('period (Arabic)', PERIODS[word].ar);
  }
  return queries;
}
