import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import SmartLink from '../components/common/SmartLink';
import HeritageCard from '../components/cards/HeritageCard';
import MapCanvas from '../components/map/MapCanvas';
import GovernorateMap from '../components/map/GovernorateMap';
import RegionList from '../components/map/RegionList';
import RegionPanel from '../components/map/RegionPanel';
import FilterPanel from '../components/explore/FilterPanel';
import ActiveFilters from '../components/explore/ActiveFilters';
import useSiteFilters from '../hooks/useSiteFilters';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useSearchParams } from '../router/RouterContext';
import { getAllSites } from '../services/siteService';
import { getGovernorateKey } from '../data/governorates';
import { applyFilters, getFacets, sortSites } from '../utils/filterSites';
import { cardsLabel } from '../utils/archiveStats';
import { getGovernorateStats } from '../utils/governorateStats';
import { getGovernorateGeometry } from '../utils/governorateGeometry';
import '../styles/map-explorer.css';
import '../styles/phase4.css';

const LIST_PAGE = 30;

/**
 * Map page. URL state: ?region=<governorate key>&site=<slug> plus the shared filters (q, type, gov, kind, has).
 * The governorate selector, statistics and deck links never depend on map geometry. The surface is
 * the verified boundary map when geometry exists, otherwise the coordinate plot.
 */
export default function MapPage() {
  useDocumentTitle('Map — Heritage Bridge');
  const sites = useMemo(() => getAllSites(), []);
  const stats = useMemo(() => getGovernorateStats(sites), [sites]);
  const geometry = useMemo(() => getGovernorateGeometry(), []);
  const { filters, setFilters, clear, activeCount } = useSiteFilters();
  const [params, setParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const [listSize, setListSize] = useState(LIST_PAGE);
  const [previewKey, setPreviewKey] = useState(null);

  const facets = useMemo(() => getFacets(sites, filters), [sites, filters]);
  const results = useMemo(() => sortSites(applyFilters(sites, filters), { ...filters, sort: filters.sort || 'name' }), [sites, filters]);

  const regionKey = params.get('region');
  const region = regionKey ? stats.byKey.get(regionKey) ?? null : null;
  const shown = (previewKey && stats.byKey.get(previewKey)) || region;
  const regionResults = region ? results.filter((s) => getGovernorateKey(s.governorate) === region.key) : results;
  const plotted = regionResults.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));

  const selected = sites.find((s) => s.slug === params.get('site')) ?? null;

  const update = (changes) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    });
  const selectRegion = (key) => {
    setListSize(LIST_PAGE);
    update({ region: key, site: null });
  };
  const selectSite = (site) => update({ site: site?.slug ?? null, region: site ? getGovernorateKey(site.governorate) : regionKey });

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow="Map"
        title="Cards on the map"
        lede="Choose a governorate to see how many cards it holds and what they are, or filter the archive and select a point."
      />

      <div className="hb-container hb-mapx__page">
        <div className="hb-mapx__filters">
          <div className="hb-mapx__searchrow">
            <SearchField value={filters.q} onChange={(q) => setFilters({ q })} />
            <button type="button" className="hb-explore__toggle hb-mapx__filterbtn" aria-expanded={panelOpen} aria-controls="map-filters" onClick={() => setPanelOpen((o) => !o)}>
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>
          <div id="map-filters" className={`hb-mapx__panel ${panelOpen ? 'is-open' : ''}`.trim()}>
            <FilterPanel layout="wide" facets={facets} filters={filters} onChange={setFilters} onClear={clear} activeCount={activeCount} />
          </div>
          <ActiveFilters filters={filters} facets={facets} onChange={setFilters} />
        </div>

        <div className="hb-mapx__grid-layout">
          <div>
            {geometry ? (
              <GovernorateMap
                geometry={geometry}
                statsByKey={stats.byKey}
                selectedKey={region?.key ?? null}
                onSelect={selectRegion}
                onPreview={setPreviewKey}
              />
            ) : (
              <>
                <p className="hb-mapx__notice">
                  Governorate boundaries are not available yet, so cards are plotted from their recorded coordinates.
                  Use the governorate list to browse by region.
                </p>
                <MapCanvas allSites={sites} visibleSites={results} selectedSite={selected} focusKey={region?.key ?? null} onSelect={selectSite} />
              </>
            )}
          </div>

          <aside className="hb-mapx__side" aria-label="Governorates, selected card and results">
            <RegionList stats={stats} selectedKey={region?.key ?? null} onSelect={selectRegion} />
            <p className="sr-only" role="status">
              {region ? `${region.name} selected. ${cardsLabel(region.count)}.` : 'No governorate selected.'}
            </p>
            <RegionPanel entry={shown} stats={stats} matching={activeCount > 0 && region ? regionResults.length : null} />

            {selected && (
              <div className="hb-mapx__selected">
                <div className="hb-mapx__selected-card">
                  <HeritageCard site={selected} headingLevel={2} showCta />
                </div>
                <button type="button" className="hb-link hb-mapx__deselect" onClick={() => selectSite(null)}>Clear selection</button>
              </div>
            )}

            <p className="hb-explore__count" role="status">
              {cardsLabel(regionResults.length)}
              {plotted.length !== regionResults.length && `, ${plotted.length} with coordinates`}
            </p>
            {regionResults.length > 0 ? (
              <ul className="hb-mapx__list">
                {regionResults.slice(0, listSize).map((site) => (
                  <li key={site.id}>
                    <button type="button" className="hb-mapx__item" aria-pressed={selected?.id === site.id} onClick={() => selectSite(site)}>
                      <span className="hb-mapx__item-name">{site.name}</span>
                      <span className="hb-mapx__item-meta">{[site.cardType.shortLabel, site.governorate].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              activeCount > 0 && (
                <div className="hb-empty">
                  <p className="hb-empty__title">No cards match.</p>
                  <button type="button" className="hb-btn hb-btn--ink" onClick={clear}>Clear all filters</button>
                </div>
              )
            )}
            {regionResults.length > listSize && (
              <button type="button" className="hb-btn hb-btn--ink" onClick={() => setListSize((n) => n + LIST_PAGE)}>Show more</button>
            )}
            <p className="hb-mapx__more"><SmartLink className="hb-link" href="/explore">Browse as a list of cards</SmartLink></p>
          </aside>
        </div>
      </div>
    </main>
  );
}
