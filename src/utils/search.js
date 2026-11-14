import { GOVERNORATE_NAMES, getGovernorateKey, governorateAlternativeNames } from '../data/governorates';

/** Unicode folding is shared by search and exact-value filters. */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function getSearchNames(site) {
  return [
    site.name,
    ...['alternativeNames', 'alternative_names', 'altNames', 'aliases'].flatMap((key) =>
      Array.isArray(site[key]) ? site[key] : [],
    ),
  ].filter((name) => typeof name === 'string' && name.trim());
}

/**
 * Search tokens: accents and Arabic vowel marks removed, Arabic letter variants unified
 * (أ إ آ → ا, ة → ه, ى → ي, ؤ → و, ئ → ي), apostrophes and ʿayn/hamza signs dropped
 * (Qal'at = Qalat, Sab‘awi = Sabawi) and every other punctuation mark treated as a space
 * (Al-Wazir = al wazir, "(Ezra)" = ezra).
 */
export function searchTokens(value) {
  return normalizeSearchText(value)
    .replace(/\u0640|[\u064B-\u065F]|\u0670/g, '') // tatweel and Arabic vowel marks
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/ı/g, 'i')
    .replace(/['’‘ʿʾʼ`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/** Articles and joining words that are ignored in a query with other words ("Tell al-Rimah" = "tell rimah"). */
const STOPWORDS = new Set(['al', 'el', 'ad', 'an', 'ar', 'as', 'ash', 'at', 'az', 'ad', 'ul', 'ud', 'the', 'of', 'and', 'i', 'e', 'y', 'و', 'في', 'من']);

/**
 * A spelling-tolerant key for one token, so common transliterations meet:
 * Tell/Tal/Tel, Qal'at/Kalat, Kadhimiya/Kazimiya, Sheikh/Shaykh, Ashur/Assur, Erbil/Arbil, Kouyunjik/Kuyunjik.
 * Latin: plural or possessive "s" dropped (words over four letters), dh → z, ch → j (Charmo = Jarmo),
 * q/c/ck → k, h dropped after a consonant or at the end (Sheikh = Shaykh, Hamam ≠ Imam),
 * every vowel written as a, doubled letters collapsed (Omar and Mar stay apart).
 * Arabic: the article ال dropped.
 */
export function looseKey(token) {
  const base = baseForm(token);
  if (!/^[a-z0-9]+$/.test(base)) return base;
  return base.replace(/dh/g, 'z').replace(/tch|ch/g, 'j').replace(/ck|qu|q|c/g, 'k')
    .replace(/([^aeiouwy])h/g, '$1').replace(/h$/, '')
    .replace(/[aeiouwy]/g, 'a').replace(/(.)\1+/g, '$1');
}

/** Singular Latin form ("churches" → "church", "Georges" → "george"), or Arabic without the article. */
function baseForm(token) {
  if (/^[a-z0-9]+$/.test(token)) return token.length > 4 ? token.replace(/(ch|sh|ss|x)es$/, '$1').replace(/([^s])s$/, '$1') : token;
  return token.length > 4 && token.startsWith('ال') ? token.slice(2) : token;
}

/**
 * Words that mean the same thing in search: English, transliterated Arabic, Kurdish and Turkish
 * terms, and the Arabic word, so "masjid", "جامع" and "mosques" all find mosques.
 */
const SYNONYMS = [
  ['mosque', 'masjid', 'masjed', 'mesjid', 'jami', 'cami', 'camii', 'مسجد', 'جامع'],
  ['church', 'kanisa', 'kenisa', 'kanisah', 'kilise', 'كنيسة', 'كنائس'],
  ['cathedral', 'كاتدرائية'],
  ['monastery', 'convent', 'dair', 'deir', 'dayr', 'دير', 'أديرة'],
  ['shrine', 'maqam', 'makam', 'mazar', 'marqad', 'imamzadeh', 'mashhad', 'مزار', 'مقام', 'مرقد', 'مشهد'],
  ['tomb', 'mausoleum', 'grave', 'qabr', 'turbe', 'turba', 'turbah', 'ضريح', 'قبر', 'تربة'],
  ['cemetery', 'graveyard', 'necropolis', 'maqbara', 'maqbarah', 'مقبرة', 'مقابر'],
  ['castle', 'citadel', 'fortress', 'fort', 'qalat', 'qala', 'qalaa', 'qalah', 'qalaat', 'kalat', 'kala', 'qelay', 'qellay', 'qalatga', 'قلعة', 'حصن', 'قلاع'],
  ['tell', 'tel', 'tal', 'mound', 'tepe', 'tappeh', 'tepa', 'gird', 'girdi', 'tulul', 'تل', 'تلول', 'تبه'],
  ['market', 'bazaar', 'bazar', 'souk', 'souq', 'suq', 'qaysariya', 'qaysariyah', 'qaisariya', 'qaysari', 'سوق', 'قيصرية', 'أسواق'],
  ['caravanserai', 'caravansary', 'khan', 'han', 'خان'],
  ['palace', 'qasr', 'kasr', 'saray', 'sarai', 'serai', 'قصر', 'سراي'],
  ['gate', 'bab', 'kapi', 'qapi', 'باب', 'بوابة'],
  ['bridge', 'jisr', 'pira', 'pire', 'جسر'],
  ['minaret', 'manara', 'manarat', 'minara', 'منارة', 'مئذنة', 'مأذنة'],
  ['synagogue', 'kanis', 'knis', 'كنيس'],
  ['bath', 'bathhouse', 'hammam', 'hamam', 'حمام'],
  ['school', 'madrasa', 'madrasah', 'madrasat', 'madrese', 'مدرسة'],
  ['temple', 'معبد'],
  ['museum', 'متحف'],
  ['cave', 'ashkawt', 'eshkaft', 'kahf', 'كهف', 'مغارة'],
  ['house', 'bayt', 'beit', 'bait', 'بيت'],
  ['prophet', 'nabi', 'nebi', 'neby', 'نبي'],
  ['saint', 'st', 'mar', 'مار', 'القديس'],
  ['relief', 'reliefs', 'نقش', 'منحوتة'],
  ['ziggurat', 'زقورة'],
  ['archaeological', 'archeological', 'archaeology', 'ancient', 'ruins', 'أثري', 'أثرية', 'آثار', 'أطلال'],
  ['city', 'town', 'madina', 'مدينة', 'بلدة'],
  ['site', 'موقع', 'مواقع'],
  ['historic', 'historical', 'heritage', 'تاريخي', 'تاريخية', 'تراثي', 'تراث'],
  ['building', 'مبنى', 'مباني', 'بناية'],
  ['monument', 'memorial', 'landmark', 'معلم', 'نصب'],
  // Historical periods and dynasties.
  ['assyrian', 'neoassyrian', 'آشوري', 'آشورية', 'الآشوري'],
  ['babylonian', 'neobabylonian', 'بابلي', 'بابلية'],
  ['sumerian', 'سومري', 'سومرية'],
  ['akkadian', 'أكدي', 'أكدية'],
  ['parthian', 'arsacid', 'فرثي', 'فرثية'],
  ['sasanian', 'sassanian', 'sasanid', 'sassanid', 'ساساني', 'ساسانية'],
  ['hellenistic', 'seleucid', 'هلنستي', 'سلوقي'],
  ['achaemenid', 'أخميني'],
  ['umayyad', 'omayyad', 'أموي', 'أموية'],
  ['abbasid', 'abbaside', 'عباسي', 'عباسية'],
  ['seljuk', 'seljuq', 'saljuq', 'سلجوقي'],
  ['atabeg', 'atabegs', 'zengid', 'zangid', 'atabek', 'أتابكي', 'زنكي'],
  ['ilkhanid', 'ilkhanate', 'إيلخاني', 'ايلخاني'],
  ['ottoman', 'osmanli', 'uthmani', 'عثماني', 'عثمانية'],
  ['islamic', 'إسلامي', 'إسلامية'],
  ['roman', 'روماني', 'رومانية'],
  ['medieval', 'وسطى', 'عصور'],
  ['modern', 'neo', 'contemporary', 'حديث', 'حديثة'],
  ['neolithic', 'نيوليثي'],
  ['paleolithic', 'palaeolithic'],
  ['prehistoric', 'prehistory'],
  ['yazidi', 'yezidi', 'ezidi', 'إيزيدي', 'ايزيدي'],
  ['christian', 'syriac', 'chaldean', 'مسيحي', 'سرياني', 'كلداني'],
  ['jewish', 'judaism', 'يهودي'],
];

const SYNONYM_GROUP = new Map();
SYNONYMS.forEach((words, group) => {
  for (const word of words) for (const token of searchTokens(word)) if (!STOPWORDS.has(token)) SYNONYM_GROUP.set(baseForm(token), group);
});
const groupOf = (token) => SYNONYM_GROUP.get(baseForm(token));

const index = { names: new WeakMap(), metadata: new WeakMap(), ranking: new WeakMap() };

/** mode: false (names), true (names and metadata), or 'ranking' (names and site type). */
function siteIndex(site, includeMetadata) {
  const cache = includeMetadata === 'ranking' ? index.ranking : includeMetadata ? index.metadata : index.names;
  if (cache.has(site)) return cache.get(site);
  const values = getSearchNames(site);
  if (includeMetadata === 'ranking') values.push(site.siteType || site.category);
  else if (includeMetadata) {
    values.push(site.city, site.approximateLocation, site.governorate, site.siteType || site.category, site.period, site.civilization, site.archiveNo, site.dateLabel);
    const key = getGovernorateKey(site.governorate);
    values.push(GOVERNORATE_NAMES[key], ...governorateAlternativeNames(key)); // Hawler, Slemani, نينوى …
  }
  const entry = tokenIndex(values.filter(Boolean).join(' '));
  cache.set(site, entry);
  return entry;
}

function tokenIndex(value) {
  const tokens = searchTokens(value);
  return {
    // Each word and, for Arabic, the word without its article, so "موصل" finds "الموصل".
    text: ` ${[...new Set([...tokens, ...tokens.map(baseForm)])].join(' ')} `,
    // General terms (castle, qala, mosque …) match by meaning only, so "Kalhu" does not meet "Qala".
    loose: new Set(tokens.filter((token) => groupOf(token) === undefined).map(looseKey)),
    groups: new Set(tokens.map(groupOf).filter((group) => group !== undefined)),
  };
}

/** One query word matches the start of a word (partial typing), a transliteration key, or a term's meaning. */
function wordMatches(entry, word) {
  if (entry.text.includes(` ${word}`)) return true;
  const base = baseForm(word);
  if (base !== word && entry.text.includes(` ${base}`)) return true;
  // A term with known variants (mosque, masjid, جامع …) matches through them only, not by spelling likeness.
  const group = groupOf(word);
  if (group !== undefined) return entry.groups.has(group);
  const key = looseKey(word);
  return word.length >= 4 && key.length >= 3 && entry.loose.has(key);
}

function queryWords(query) {
  const tokens = searchTokens(query);
  const meaningful = tokens.filter((token) => !STOPWORDS.has(token));
  return meaningful.length ? meaningful : tokens;
}

/** Share (0–1) of the query's words found in the site's own names or its type, used to rank results. */
export function nameMatchShare(site, query) {
  const words = queryWords(query);
  if (!words.length) return 0;
  const entry = siteIndex(site, 'ranking');
  return words.filter((word) => wordMatches(entry, word)).length / words.length;
}

function fieldRelevance(text, query, words) {
  if (!text) return 0;
  const occurrences = words.reduce((total, word) => total + text.split(word).length - 1, 0);
  const density = occurrences / Math.max(1, text.split(/[^\p{L}\p{N}]+/u).length);
  return words.filter((word) => text.includes(word)).length + density +
    (text === query ? 6 : text.includes(query) ? 3 : 0);
}

const descriptions = new WeakMap();
const descriptionText = (site) => normalizeSearchText([site.description, site.shortDescription].filter(Boolean).join(' '));
function descriptionIndex(site) {
  if (!descriptions.has(site)) {
    const words = searchTokens(descriptionText(site));
    descriptions.set(site, new Set(words.flatMap((word) => [word, baseForm(word)])));
  }
  return descriptions.get(site);
}

/** Lower ranks are stronger. Infinity means at least one query word is absent. */
export function searchSiteRank(site, query = '', { includeMetadata = false } = {}) {
  return rankSite(site, normalizeSearchText(query), queryWords(query), includeMetadata);
}

function rankSite(site, q, required, includeMetadata) {
  const words = q.split(' ');
  if (!required.length) return 0;
  const indexed = siteIndex(site, includeMetadata);
  const structuredMatch = required.every((word) => wordMatches(indexed, word));
  if (!structuredMatch && (!includeMetadata ||
    !required.every((word) => wordMatches(indexed, word) ||
      // Historic districts contain multiple kinds of sites described in their records.
      ((groupOf(word) === undefined || (site.siteType || site.category) === 'Historic Urban Area')
        && descriptionIndex(site).has(baseForm(word)))))) return Infinity;
  const names = getSearchNames(site).map(normalizeSearchText);
  const primary = normalizeSearchText(site.name);
  if (primary === q) return 0;
  if (names.some((name) => name === q)) return 1;
  if (names.some((name) => name.startsWith(q))) return 2;
  if (words.every((word) => names.some((name) => name.split(/[^\p{L}\p{N}]+/u).some((part) => part.startsWith(word))))) return 3;
  if (words.every((word) => names.some((name) => name.includes(word)))) return 4;
  const metadataFields = includeMetadata ? [
    [site.governorate, 4], [site.siteType || site.category, 4], [site.period, 4],
    [site.civilization, 4], [site.city, 3], [site.archiveNo, 3], [site.dateLabel, 1],
  ].map(([value, weight]) => [normalizeSearchText(value), weight]) : [];
  const metadataScore = metadataFields.reduce((score, [text, weight]) => score + weight * fieldRelevance(text, q, words), 0) +
    names.reduce((score, text) => score + 6 * fieldRelevance(text, q, words), 0);
  if (required.every((word) => wordMatches(siteIndex(site, false), word))) return 4.5;
  // Fractions refine a tier without ever crossing a stronger name/metadata tier.
  if (structuredMatch) return 5 + (1 - nameMatchShare(site, q)) * 0.5 + 0.49 / (1 + metadataScore);
  return 6 + 1 / (1 + metadataScore + fieldRelevance(descriptionText(site), q, words));
}

/** All words must match; equal relevance preserves the original local order. */
export function searchSites(sites, query = '', options = {}) {
  const q = normalizeSearchText(query);
  const required = queryWords(query);
  if (!required.length) return [...sites];
  return sites.map((site) => ({ site, rank: rankSite(site, q, required, options.includeMetadata ?? false) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank)
    .map(({ site }) => site);
}
