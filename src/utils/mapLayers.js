import { getHeritageCategories } from './heritageCategories';
import { isApprovedSite, hasVerifiedModel } from './modelResources';
import { getSiteHistoryEras } from './history';
import { isDisappearedSite } from './heritageExperience';

// Layer membership reuses recorded facts; categories are browsing groups, not verification.
export const MAP_LAYERS = [
  { id: 'archaeological', label: 'Archaeological sites', matches: (site) => getHeritageCategories(site).includes('archaeological') },
  { id: 'religious', label: 'Religious heritage', matches: (site) => getHeritageCategories(site).includes('religious') },
  { id: 'unesco', label: 'UNESCO sites', matches: (site) => isApprovedSite(site) && site.isUnesco === true },
  { id: 'lost', label: 'Disappeared heritage', matches: isDisappearedSite },
  { id: '3d', label: '3D-documented sites', matches: hasVerifiedModel },
  { id: 'historical-periods', label: 'Recorded historical periods', matches: (site) => isApprovedSite(site) && [site.period, site.civilization].some((value) => typeof value === 'string' && value.trim()) },
];

export function readMapOptions(params) {
  return {
    layers: [...new Set(params.getAll('layer').filter((id) => MAP_LAYERS.some((layer) => layer.id === id)))],
    historical: params.get('view') === 'history',
    era: params.get('era') || '',
    clustered: params.get('cluster') !== 'off',
  };
}

export function filterMapSites(sites, { layers = [], historical = false, era = '' } = {}) {
  return sites.filter((site) => {
    if (historical && (!isApprovedSite(site) || (era && !getSiteHistoryEras(site).some((group) => group.id === era)))) return false;
    return !layers.length || MAP_LAYERS.some((layer) => layers.includes(layer.id) && layer.matches(site));
  });
}

export const getMapLayerCounts = (sites) => Object.fromEntries(MAP_LAYERS.map((layer) => [layer.id, sites.filter(layer.matches).length]));
// Broader grouping at national scale, finer separation as visitors zoom in.
export const clusterRadius = (zoom) => zoom < 8 ? 60 : zoom < 12 ? 40 : 24;
