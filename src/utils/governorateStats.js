import { CARD_TYPES } from '../data/cardTypes';
import { GOVERNORATE_NAMES, getGovernorateKey } from '../data/governorates';

const tally = (items) => {
  const counts = new Map();
  for (const item of items) if (item) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

/**
 * Per-governorate statistics, derived entirely from the normalized sites.
 * Independent of any map geometry: the list, panel and (future) boundary map all read this.
 * Governorates from GOVERNORATE_NAMES are always present (count 0 when the archive has no cards there);
 * any other governorate found in the data is added.
 * Returns { list, byKey } sorted: represented first (most cards first), then the rest A–Z.
 */
export function getGovernorateStats(sites) {
  const entries = new Map();
  const ensure = (key, name) => {
    if (!entries.has(key)) entries.set(key, { key, name, sites: [] });
    return entries.get(key);
  };
  Object.entries(GOVERNORATE_NAMES).forEach(([key, name]) => ensure(key, name));
  for (const site of sites) {
    if (site.governorate) ensure(getGovernorateKey(site.governorate), site.governorate).sites.push(site);
  }

  const list = [...entries.values()].map(({ key, name, sites: own }) => {
    const types = CARD_TYPES.map((type) => ({ tier: type.tier, label: type.shortLabel, count: own.filter((s) => s.cardType.tier === type.tier).length }));
    const unclassified = own.filter((s) => s.cardType.tier === 0).length;
    if (unclassified > 0) types.push({ tier: 0, label: 'Unclassified', count: unclassified });
    return {
      key,
      name,
      sites: own,
      count: own.length,
      represented: own.length > 0,
      href: own.length > 0 ? `/decks/${key}` : null,
      types: types.filter((t) => t.count > 0),
      kinds: tally(own.map((s) => s.siteType)),
      digital: {
        unesco: own.filter((s) => s.isUnesco).length,
        models: own.filter((s) => s.hasModel).length,
        videos: own.filter((s) => s.hasVideo).length,
        documented: own.filter((s) => s.hasOurWork).length,
      },
    };
  });

  list.sort((a, b) => Number(b.represented) - Number(a.represented) || b.count - a.count || a.name.localeCompare(b.name));
  return { list, byKey: new Map(list.map((entry) => [entry.key, entry])) };
}
