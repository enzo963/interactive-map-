import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import SmartLink from '../components/common/SmartLink';
import HeritageCard from '../components/cards/HeritageCard';
import MapCanvas from '../components/map/MapCanvas';
import PlaceForm from '../components/map/PlaceForm';
import FilterPanel from '../components/explore/FilterPanel';
import ActiveFilters from '../components/explore/ActiveFilters';
import useSiteFilters from '../hooks/useSiteFilters';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useSearchParams } from '../router/RouterContext';
import { getAllSites } from '../services/siteService';
import { applyFilters, getFacets, sortSites } from '../utils/filterSites';
import { cardsLabel } from '../utils/archiveStats';
import '../styles/map-explorer.css';

const LIST_PAGE = 30;
// Editing writes to src/data/sites.json through the Vite dev server, so it only exists in development.
const CAN_EDIT = import.meta.env.DEV;

export default function MapPage() {
  useDocumentTitle('Map — Heritage Bridge');
  const sites = useMemo(() => getAllSites(), []);
  const { filters, setFilters, clear, activeCount } = useSiteFilters();
  const [params, setParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const [listSize, setListSize] = useState(LIST_PAGE);
  const [editing, setEditing] = useState(null); // null | { target: 'new' | site id }
  const [draft, setDraft] = useState(null);

  const facets = useMemo(() => getFacets(sites, filters), [sites, filters]);
  const results = useMemo(() => sortSites(applyFilters(sites, filters), { ...filters, sort: filters.sort || 'name' }), [sites, filters]);
  const plotted = results.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));

  const selectedSlug = params.get('site');
  const selected = sites.find((s) => s.slug === selectedSlug) ?? null;
  const select = (site) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (site) next.set('site', site.slug); else next.delete('site');
      return next;
    });

  const startEditing = (site) => {
    setEditing({ target: site?.id ?? 'new' });
    setDraft(site && Number.isFinite(site.latitude) ? { lat: site.latitude, lng: site.longitude } : null);
  };
  const stopEditing = () => { setEditing(null); setDraft(null); };
  const onSaved = (raw) => {
    stopEditing();
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('site', raw.slug);
      return next;
    });
  };

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow="Map"
        title="Cards on the map"
        lede="Each diamond is a card. Filter the archive, then select a pin or a name to open its card."
      />

      <div className="hb-container hb-mapx__page">
        <div className="hb-mapx__filters">
          <div className="hb-mapx__searchrow">
            <SearchField value={filters.q} onChange={(q) => setFilters({ q })} />
            <button type="button" className="hb-explore__toggle hb-mapx__filterbtn" aria-expanded={panelOpen} aria-controls="map-filters" onClick={() => setPanelOpen((o) => !o)}>
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            {CAN_EDIT && !editing && (
              <button type="button" className="hb-btn hb-btn--ink hb-mapx__addbtn" onClick={() => startEditing(null)}>+ Add a place</button>
            )}
          </div>
          <div id="map-filters" className={`hb-mapx__panel ${panelOpen ? 'is-open' : ''}`.trim()}>
            <FilterPanel layout="wide" facets={facets} filters={filters} onChange={setFilters} onClear={clear} activeCount={activeCount} />
          </div>
          <ActiveFilters filters={filters} facets={facets} onChange={setFilters} />
        </div>

        <div className="hb-mapx__grid-layout">
          <MapCanvas
            allSites={sites}
            visibleSites={results}
            selectedSite={selected}
            onSelect={select}
            picking={Boolean(editing)}
            draft={draft}
            onPick={setDraft}
          />

          <aside className="hb-mapx__side" aria-label="Selected card and results">
            {editing && (
              <PlaceForm
                key={editing.target}
                sites={sites}
                initialTarget={editing.target}
                draft={draft}
                onDraftChange={setDraft}
                onCancel={stopEditing}
                onSaved={onSaved}
              />
            )}
            {!editing && selected && (
              <div className="hb-mapx__selected">
                <div className="hb-mapx__selected-card">
                  <HeritageCard site={selected} headingLevel={2} showCta />
                </div>
                <div className="hb-mapx__selected-actions">
                  <button type="button" className="hb-link hb-mapx__deselect" onClick={() => select(null)}>Clear selection</button>
                  {CAN_EDIT && <button type="button" className="hb-link hb-mapx__deselect" onClick={() => startEditing(selected)}>Move this pin</button>}
                </div>
              </div>
            )}

            <p className="hb-explore__count" role="status">
              {cardsLabel(results.length)}
              {plotted.length !== results.length && `, ${plotted.length} with coordinates`}
            </p>
            {results.length > 0 ? (
              <ul className="hb-mapx__list">
                {results.slice(0, listSize).map((site) => (
                  <li key={site.id}>
                    <button
                      type="button"
                      className="hb-mapx__item"
                      aria-pressed={selected?.id === site.id}
                      onClick={() => select(site)}
                    >
                      <span className="hb-mapx__item-name">{site.name}</span>
                      <span className="hb-mapx__item-meta">{[site.cardType.shortLabel, site.governorate].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hb-empty">
                <p className="hb-empty__title">No cards match.</p>
                <button type="button" className="hb-btn hb-btn--ink" onClick={clear}>Clear all filters</button>
              </div>
            )}
            {results.length > listSize && (
              <button type="button" className="hb-btn hb-btn--ink" onClick={() => setListSize((n) => n + LIST_PAGE)}>Show more</button>
            )}
            <p className="hb-mapx__more"><SmartLink className="hb-link" href="/explore">Browse as a list of cards</SmartLink></p>
          </aside>
        </div>
      </div>
    </main>
  );
}
