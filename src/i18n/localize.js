import { getGovernorateKey } from '../data/governorates.js';
import {
  CITIES,
  CIVILIZATIONS,
  COUNTRIES,
  GOVERNORATES,
  HERITAGE_STATUS,
  PERIODS,
  SITE_TYPES,
  UNESCO_STATUS,
  VERIFICATION_STATUS,
} from './vocabulary.js';
import { LANGUAGES } from './languages.js';

const fold = (value) => String(value ?? '').trim().toLowerCase();
const pick = (table, key, lang) => table[key]?.[lang];

/**
 * Display text for the data. The data layer keeps its English values (filters, keys and
 * archive numbers depend on them); only what the visitor reads is translated here.
 * Anything without a translation falls back to the value as written.
 */
export function createLocalizer(lang, t, locale) {
  const siteCache = new WeakMap();
  const typeCache = new WeakMap();

  const governorate = (name) => (name ? pick(GOVERNORATES, getGovernorateKey(name), lang) ?? name : '');
  const country = (name) => (name ? pick(COUNTRIES, fold(name), lang) ?? name : '');
  const city = (name) => (name ? pick(CITIES, fold(name), lang) ?? name : '');
  const kind = (name) => (name ? pick(SITE_TYPES, fold(name), lang) ?? name : '');
  const period = (name) => (name ? pick(PERIODS, fold(name), lang) ?? name : '');
  const civilization = (name) => (name ? pick(CIVILIZATIONS, fold(name), lang) ?? name : '');
  const status = (table) => (value) => (value ? pick(table, fold(value), lang) ?? value : '');
  const heritageStatus = status(HERITAGE_STATUS);
  const unescoStatus = status(UNESCO_STATUS);
  const verificationStatus = status(VERIFICATION_STATUS);

  function cardType(type) {
    let out = typeCache.get(type);
    if (out) return out;
    if (type.id === 'unclassified') {
      out = { ...type, shortLabel: t('cardType.unclassified'), rangeLabel: t('cardType.noDate') };
    } else {
      out = {
        ...type,
        shortLabel: t('cardType.short', { numeral: type.numeral }),
        rankLabel: type.rankLabel === 'Legendary' ? t('cardType.legendary') : type.rankLabel,
        rangeLabel:
          type.maxAge === null
            ? t('cardType.rangeOpen', { min: type.minAge })
            : t('cardType.range', { min: type.minAge, max: type.maxAge }),
      };
    }
    typeCache.set(type, out);
    return out;
  }

  function dateLabel(site) {
    if (typeof site.dateYear === 'number' && Number.isFinite(site.dateYear)) {
      return t(site.dateYear < 0 ? 'date.bce' : 'date.ce', { n: Math.abs(site.dateYear) });
    }
    return site.dateLabel; // authored text such as "12th century" is kept as written
  }

  /** The text of one site in the current language. */
  function localizeSite(site) {
    const cached = siteCache.get(site);
    if (cached) return cached;

    const type = cardType(site.cardType);
    let out;

    if (site.isSpecimen) {
      out = {
        name: t('card.specimen'),
        siteType: t('card.sample'),
        governorate: '',
        country: '',
        city: '',
        period: '',
        civilization: '',
        shortDescription: '',
        description: '',
        dateLabel: type.rangeLabel,
        imageAlt: '',
        cardType: type,
        heritageStatus: '',
        unescoStatus: '',
        verificationStatus: '',
      };
    } else {
      const own = site.translations?.[lang] ?? {};
      const name = own.name ?? site.name;
      const siteType = own.siteType ?? kind(site.siteType);
      const gov = governorate(site.governorate);
      out = {
        name,
        siteType,
        governorate: gov,
        country: country(site.country),
        city: own.city ?? city(site.city),
        period: own.period ?? period(site.period),
        civilization: own.civilization ?? civilization(site.civilization),
        shortDescription: own.shortDescription ?? site.shortDescription,
        description: own.description ?? own.shortDescription ?? site.description,
        dateLabel: dateLabel(site),
        imageAlt:
          own.imageAlt ?? (site.hasCustomImageAlt ? site.imageAlt : [name, siteType, gov].filter(Boolean).join(' — ')),
        cardType: type,
        heritageStatus: heritageStatus(site.heritageStatus),
        unescoStatus: unescoStatus(site.unescoStatus),
        verificationStatus: verificationStatus(site.verificationStatus),
      };
    }
    siteCache.set(site, out);
    return out;
  }

  /** Title and blurb of a deck from utils/decks.js. */
  function localizeDeck(deck) {
    if (deck.kind === 'governorate') {
      const name = governorate(deck.name);
      return { name, title: t('deck.govTitle', { name }), blurb: t('deck.govBlurb', { name }) };
    }
    return {
      name: deck.title,
      title: t(`specialDeck.${deck.id}.title`),
      blurb: t(`specialDeck.${deck.id}.blurb`),
    };
  }

  const cardsLabel = (n) => t('count.cards', { n });
  const decksLabel = (n) => t('count.decks', { n });
  const latitude = (v) => `${Math.abs(v)}°${t(v >= 0 ? 'geo.N' : 'geo.S')}`;
  const longitude = (v) => `${Math.abs(v)}°${t(v >= 0 ? 'geo.E' : 'geo.W')}`;
  const collator = new Intl.Collator(locale);

  return {
    site: localizeSite,
    deck: localizeDeck,
    cardType,
    governorate,
    kind,
    cardsLabel,
    decksLabel,
    latitude,
    longitude,
    compare: collator.compare,
  };
}

/** Names of a site in EVERY language, so a search finds a place however it is spelled. */
export function searchAliases(site) {
  const parts = [];
  for (const { code } of LANGUAGES) {
    if (code === 'en') continue;
    parts.push(
      site.translations?.[code]?.name,
      site.translations?.[code]?.city,
      pick(GOVERNORATES, getGovernorateKey(site.governorate), code),
      pick(CITIES, fold(site.city), code),
      pick(SITE_TYPES, fold(site.siteType), code),
      pick(PERIODS, fold(site.period), code),
      pick(CIVILIZATIONS, fold(site.civilization), code),
    );
  }
  return parts.filter(Boolean).join(' ');
}
