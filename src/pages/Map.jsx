import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import SmartLink from '../components/common/SmartLink';
import HeritageCard from '../components/cards/HeritageCard';
import MapCanvas from '../components/map/MapCanvas';
import GovernorateMap from '../components/map/GovernorateMap';
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

const mapPageStyles = `
.hb-map-page .hb-mapx__governorates { padding-block: 1rem; border-block: 1px solid var(--hb-rule); }
.hb-map-page .hb-mapx__governorates h2 { font-family: var(--hb-font-serif); font-weight: 500; font-size: 1.4rem; margin-bottom: .75rem; }
.hb-map-page .hb-regions { gap: .5rem; }
.hb-map-page .hb-region { min-height: 2.75rem; padding: .5rem .75rem; gap: .75rem; text-align: left; }
.hb-map-page .hb-region__count { min-width: 1.75rem; padding: .15rem .4rem; border-radius: 2px; background: #756b5918; text-align: center; font-variant-numeric: tabular-nums; }
.hb-map-page .hb-region[aria-pressed='true'] { border-width: 2px; padding: calc(.5rem - 1px) calc(.75rem - 1px); }
.hb-map-page .hb-region[aria-pressed='true'] .hb-region__count { background: #ffffff20; }
.hb-map-page .hb-region:focus-visible { outline-offset: 3px; }
.hb-map-page .hb-geomap__area[data-selected='true'] { fill: var(--hb-terracotta); stroke: var(--hb-ink); stroke-width: 2; }
.hb-map-page .hb-mapx__summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem 1.5rem; padding: .875rem 1rem; background: var(--hb-paper-raised); border-left: 3px solid var(--hb-terracotta); margin-bottom: 1rem; }
.hb-map-page .hb-mapx__summary p { line-height: 1.6; }
.hb-map-page .hb-mapx__selected-name { margin-top: .5rem; }
.hb-map-page .hb-mapx__item { padding: .75rem; gap: .25rem; overflow-wrap: anywhere; }
.hb-map-page .hb-mapx__item[aria-pressed='true'] { background: var(--hb-paper-raised); }
.hb-map-page .hb-mapx__selected-card { width: min(100%, 14rem); }
.hb-map-page .hb-empty { padding: 1.25rem; }
@media (hover: hover) {
  .hb-map-page .hb-region:hover:not([aria-pressed='true']) { background: var(--hb-sand); border-color: var(--hb-ink); }
}
@media (max-width: 40rem) {
  .hb-map-page .hb-mapx__searchrow { flex-wrap: wrap; }
  .hb-map-page .hb-mapx__searchrow .hb-search { min-width: 0; flex-basis: 100%; }
  .hb-map-page .hb-mapx__filterbtn { width: 100%; justify-content: center; }
  .hb-map-page .hb-regions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hb-map-page .hb-region { justify-content: space-between; overflow-wrap: anywhere; }
  .hb-map-page .hb-region__count { flex-shrink: 0; }
  .hb-map-page .hb-mapx__list { max-height: none; }
}
`;


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

  const matchingByRegion = useMemo(() => {
    const counts = new Map();
    for (const site of results) {
      const key = getGovernorateKey(site.governorate);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [results]);

  const regionKey = params.get('region');
  const region = regionKey ? stats.byKey.get(regionKey) ?? null : null;
  const shown = (previewKey && stats.byKey.get(previewKey)) || region;
  const regionResults = region ? results.filter((s) => getGovernorateKey(s.governorate) === region.key) : results;
  const plotted = regionResults.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));

  const selected = regionResults.find((s) => s.slug === params.get('site')) ?? null;

  const update = (changes) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    });
  const selectRegion = (key) => {
    setListSize(LIST_PAGE);
    setPreviewKey(null);
    update({ region: key === regionKey ? null : key, site: null });
  };
  const selectSite = (site) => {
    setPreviewKey(null);
    update({ site: site?.id === selected?.id ? null : site?.slug ?? null, region: site ? getGovernorateKey(site.governorate) : regionKey });
  };

  return (
    <main id="main" tabIndex={-1} className="hb-page hb-map-page">
      <style href="hb-map-page-interactions" precedence="components">{mapPageStyles}</style>
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

        <section className="hb-mapx__governorates" aria-labelledby="map-governorates">
          <h2 id="map-governorates">Choose a governorate</h2>
          <div className="hb-regions" role="group" aria-label="Governorates">
            {stats.list.map((entry) => {
              const matching = matchingByRegion.get(entry.key) ?? 0;
              return (
                <button type="button" className="hb-region" key={entry.key}
                  aria-pressed={entry.key === region?.key} data-represented={entry.represented}
                  aria-label={`${entry.name}, ${cardsLabel(matching)} matching out of ${entry.count} total. ${entry.key === region?.key ? 'Select again to show all governorates.' : 'Select to show this governorate.'}`}
                  onClick={() => selectRegion(entry.key)}
                  onPointerEnter={(event) => { if (event.pointerType === 'mouse') setPreviewKey(entry.key); }}
                  onPointerLeave={() => setPreviewKey(null)}
                  onFocus={() => setPreviewKey(entry.key)} onBlur={() => setPreviewKey(null)}>
                  <span>{entry.name}</span>
                  <span className="hb-region__count" aria-hidden="true">{activeCount > 0 ? `${matching} / ${entry.count}` : entry.count}</span>
                </button>
              );
            })}
          </div>
          {activeCount > 0 && <p className="hb-map__caption">Counts show matching cards / total cards.</p>}
        </section>
        <div className="hb-mapx__summary">
          <div>
            <p role="status" aria-live="polite"><strong>{region?.name ?? 'All governorates'}</strong> · {cardsLabel(regionResults.length)} matching · {plotted.length} with coordinates</p>
            {selected && <p className="hb-mapx__selected-name">Selected: <SmartLink className="hb-link" href={selected.href}>{selected.name}</SmartLink></p>}
          </div>
          {region && <button type="button" className="hb-btn" onClick={() => selectRegion(null)}>Show all governorates</button>}
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
                <MapCanvas allSites={sites} visibleSites={results} selectedSite={selected} focusKey={region?.key ?? null} onSelect={selectSite} onSelectRegion={selectRegion} onPreviewRegion={setPreviewKey} />
              </>
            )}
          </div>

          <aside className="hb-mapx__side" aria-label="Governorates, selected card and results">
            <p className="sr-only" role="status">
              {region ? `${region.name} selected. ${cardsLabel(region.count)}.` : 'No governorate selected.'}
            </p>
            <RegionPanel entry={shown} stats={stats} matching={activeCount > 0 && shown ? matchingByRegion.get(shown.key) ?? 0 : null} />

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
              <div className="hb-empty">
                <h2 className="hb-empty__title">{activeCount > 0 ? 'No cards match these filters' : 'No cards recorded here yet'}</h2>
                {activeCount > 0 && <button type="button" className="hb-btn hb-btn--ink" onClick={clear}>Clear all filters</button>}
                {region && <button type="button" className="hb-link hb-mapx__deselect" onClick={() => selectRegion(null)}>Browse all governorates</button>}
              </div>
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
