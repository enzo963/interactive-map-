import { useEffect, useMemo, useRef, useState } from 'react';
import StatePanel from '../components/common/StatePanel';
import SearchField from '../components/common/SearchField';
import SmartLink from '../components/common/SmartLink';
import HeritageCard from '../components/cards/HeritageCard';
import MapCanvas from '../components/map/MapCanvas';
import PlaceForm from '../components/map/PlaceForm';
import GovernorateMap from '../components/map/GovernorateMap';
import RegionPanel from '../components/map/RegionPanel';
import FilterPanel from '../components/explore/FilterPanel';
import ActiveFilters from '../components/explore/ActiveFilters';
import useSiteFilters from '../hooks/useSiteFilters';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useHeaderHeight from '../hooks/useHeaderHeight';
import { useSearchParams } from '../router/RouterContext';
import { getAllSites } from '../services/siteService';
import { getGovernorateKey } from '../data/governorates';
import { applyFilters, getFacets, sortSites, serializeFilters } from '../utils/filterSites';
import { cardsLabel } from '../utils/archiveStats';
import { getGovernorateStats } from '../utils/governorateStats';
import { getGovernorateGeometry } from '../utils/governorateGeometry';
import '../styles/map-explorer.css';
import '../styles/map-first.css';
import '../styles/phase4.css';
import { t } from '../i18n';

const LIST_PAGE = 30;
// Editing writes to src/data/sites.json through the Vite dev server, so it only exists in development.
const CAN_EDIT = import.meta.env.DEV;

const mapPageStyles = `
/* Inside the map-first panel (src/styles/map-first.css): a single column of controls that scrolls on its own. */
.hb-map-page .hb-mapx__filters { display: grid; gap: .6rem; }
.hb-map-page .hb-mapx__searchrow { align-items: stretch; }
.hb-map-page .hb-mapx__searchrow .hb-search { flex: 1 1 auto; min-width: 0; }
.hb-map-page .hb-mapx__addbtn { justify-self: start; }
.hb-map-page .hb-mapx__governorates { display: grid; gap: .6rem; }
.hb-map-page .hb-regions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .4rem; }
.hb-map-page .hb-region { justify-content: space-between; gap: .4rem; padding: .45rem .55rem; font-size: .875rem; }
.hb-map-page .hb-region > span:first-child { min-width: 0; overflow-wrap: break-word; hyphens: auto; }
.hb-map-page .hb-region__count { flex-shrink: 0; }
.hb-map-page .hb-mapx__results { display: grid; gap: .6rem; }
.hb-map-page .hb-mapx__list { max-height: none; }
.hb-map-page .hb-mapx__summary { margin-bottom: 0; }
.hb-map-page .hb-region { min-height: 2.75rem; text-align: start; }
.hb-map-page .hb-region__count { min-width: 1.75rem; padding: .15rem .4rem; border-radius: 2px; background: color-mix(in srgb, var(--hb-earth) 10%, transparent); text-align: center; font-variant-numeric: tabular-nums; }
.hb-map-page .hb-region[aria-pressed='true'] { border-width: 2px; padding: calc(.45rem - 1px) calc(.55rem - 1px); }
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
  .hb-map-page .hb-mapx__searchrow .hb-search { flex-basis: 100%; }
  .hb-map-page .hb-mapx__filterbtn { width: 100%; justify-content: center; }
}
`;

/**
 * Map page. URL state: ?region=<governorate key>&site=<slug> plus the shared filters (q, type, gov, kind, has).
 * The governorate selector, statistics and deck links never depend on map geometry. The surface is
 * the verified boundary map when geometry exists, otherwise the coordinate plot.
 */
export default function MapPage() {
  useDocumentTitle('Map — History in Cards');
  useHeaderHeight();
  const sites = useMemo(() => getAllSites(), []);
  const stats = useMemo(() => getGovernorateStats(sites), [sites]);
  const geometry = useMemo(() => getGovernorateGeometry(), []);
  const { filters, setFilters, clear, activeCount } = useSiteFilters();
  const [params, setParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const [listSize, setListSize] = useState(LIST_PAGE);
  const [previewKey, setPreviewKey] = useState(null);
  const [editing, setEditing] = useState(null); // null | { target: 'new' | site id }
  const [draft, setDraft] = useState(null);
  const resultList = useRef(null);
  const nextResult = useRef(null);
  useEffect(() => {
    if (nextResult.current === null) return;
    resultList.current?.children[nextResult.current]?.querySelector('button')?.focus();
    nextResult.current = null;
  }, [listSize]);

  const facetSites = stats.byKey.get(params.get('region'))?.sites ?? sites;
  const facets = useMemo(() => getFacets(facetSites, filters), [facetSites, filters]);
  const results = useMemo(
    () => sortSites(applyFilters(sites, filters), { ...filters, sort: filters.sort || 'name' }),
    [sites, filters],
  );

  const matchingByRegion = useMemo(() => {
    const counts = new Map();
    for (const site of results) {
      const key = getGovernorateKey(site.governorate);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [results]);

  const regionKey = getGovernorateKey(params.get('region'));
  const region = regionKey ? (stats.byKey.get(regionKey) ?? null) : null;
  const shown = (previewKey && stats.byKey.get(previewKey)) || region;
  const regionResults = region
    ? results.filter((s) => getGovernorateKey(s.governorate) === region.key)
    : results;
  const plotted = regionResults.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));

  const selected = regionResults.find((s) => s.slug === params.get('site')) ?? null;
  const requestedSite = params.get('site');
  const knownSite = requestedSite && sites.some((site) => site.slug === requestedSite);

  const update = (changes) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    });
  const selectRegion = (key) => {
    setListSize(LIST_PAGE);
    setPreviewKey(null);
    setParams((current) => {
      const next = new URLSearchParams(current);
      const value = key === regionKey ? null : key;
      if (value) next.set('region', value);
      else next.delete('region');
      next.delete('site');
      next.delete('gov');
      return next;
    });
  };
  const selectSite = (site) => {
    setPreviewKey(null);
    update({
      site: site?.id === selected?.id ? null : (site?.slug ?? null),
      region: site ? getGovernorateKey(site.governorate) : regionKey,
    });
  };

  const startEditing = (site) => {
    setEditing({ target: site?.id ?? 'new' });
    setDraft(site && Number.isFinite(site.latitude) ? { lat: site.latitude, lng: site.longitude } : null);
  };
  const stopEditing = () => { setEditing(null); setDraft(null); };
  const onSaved = (raw) => {
    stopEditing();
    update({ site: raw.slug, region: getGovernorateKey(raw.governorate) || null });
  };

  const browseParams = serializeFilters({
    ...filters,
    governorates: region ? [region.key] : filters.governorates,
  });
  const panelBrowseParams = serializeFilters({
    ...filters,
    governorates: shown ? [shown.key] : filters.governorates,
  });
  const showResults = () => {
    setPanelOpen(false);
    document.getElementById('map-result-heading')?.focus();
  };

  const mapSurface = geometry ? (
    <GovernorateMap
      geometry={geometry}
      statsByKey={stats.byKey}
      selectedKey={region?.key ?? null}
      onSelect={selectRegion}
      onPreview={setPreviewKey}
    />
  ) : (
    <MapCanvas
      allSites={sites}
      visibleSites={results}
      selectedSite={selected}
      focusKey={region?.key ?? null}
      onSelect={selectSite}
      onSelectRegion={selectRegion}
      onPreviewRegion={setPreviewKey}
      picking={Boolean(editing)}
      draft={draft}
      onPick={setDraft}
      size="fill"
    />
  );

  return (
    <main id="main" tabIndex={-1} className="hb-map-page">
      <style href="hb-map-page-interactions" precedence="components">
        {mapPageStyles}
      </style>
      {/* Map first, as on the home page: the map fills the window and every control sits in the panel on the right. */}
      <section className="hb-mapfirst" aria-labelledby="map-page-title">
        <div className="hb-mapfirst__map">{mapSurface}</div>

        <aside className="hb-mapfirst__panel hb-mapx__side" aria-label={t('Map controls, governorates, selected card and results')}>
          <header className="hb-mapfirst__intro">
            <p className="hb-eyebrow">{t('Map')}</p>
            <h1 id="map-page-title" className="hb-mapfirst__title">{t('Cards on the map')}</h1>
            <p className="hb-mapfirst__lede">{t('Choose a governorate to see how many cards it holds and what they are, or filter the archive and select a point.')}</p>
          </header>

          <div className="hb-mapx__filters">
            <div className="hb-mapx__searchrow">
              <SearchField value={filters.q} onChange={(q) => setFilters({ q })} />
              <button
                type="button"
                className="hb-explore__toggle hb-mapx__filterbtn"
                aria-expanded={panelOpen}
                aria-controls="map-filters"
                onClick={() => setPanelOpen((o) => !o)}
              >
                {t('Filters')}{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            </div>
            {CAN_EDIT && !editing && (
              <button type="button" className="hb-btn hb-btn--ink hb-mapx__addbtn" onClick={() => startEditing(null)}>
                {t('+ Add a place')}
              </button>
            )}
            <div id="map-filters" className={`hb-mapx__panel ${panelOpen ? 'is-open' : ''}`.trim()}>
              <FilterPanel
                facets={facets}
                filters={filters}
                onChange={setFilters}
                onClear={clear}
                activeCount={activeCount}
                onDone={showResults}
                resultCount={regionResults.length}
                hideGovernorate
              />
            </div>
            <ActiveFilters filters={filters} facets={facets} onChange={setFilters} />
          </div>

          <section className="hb-mapx__governorates" aria-labelledby="map-governorates">
            <h2 id="map-governorates" className="hb-mapfirst__h2">{t('Choose a governorate')}</h2>
            <div className="hb-regions" role="group" aria-label={t('Governorates')}>
              {stats.list.map((entry) => {
                const matching = matchingByRegion.get(entry.key) ?? 0;
                return (
                  <button
                    type="button"
                    className="hb-region"
                    key={entry.key}
                    aria-pressed={entry.key === region?.key}
                    data-represented={entry.represented}
                    aria-label={`${t('{name}, {cards} matching out of {total} total.', { name: t(entry.name), cards: cardsLabel(matching), total: entry.count })} ${entry.key === region?.key ? t('Select again to show all governorates.') : t('Select to show this governorate.')}`}
                    onClick={() => selectRegion(entry.key)}
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') setPreviewKey(entry.key);
                    }}
                    onPointerLeave={() => setPreviewKey(null)}
                    onFocus={() => setPreviewKey(entry.key)}
                    onBlur={() => setPreviewKey(null)}
                  >
                    <span>{t(entry.name)}</span>
                    <span className="hb-region__count" aria-hidden="true">
                      {activeCount > 0 ? `${matching} / ${entry.count}` : entry.count}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeCount > 0 && <p className="hb-map__caption">{t('Counts show matching cards / total cards.')}</p>}
          </section>

          {params.get('region') && !region && <StatePanel kind="unavailable" title={t('Governorate not found')} compact
            description={t('This governorate is not recognized. Results below show all governorates with your other filters preserved.')}>
            <button type="button" className="hb-btn" onClick={() => update({ region: null })}>{t('Remove invalid governorate')}</button>
          </StatePanel>}
          {requestedSite && !selected && <StatePanel kind="unavailable" compact
            title={knownSite ? t('Selected card is outside these results') : t('Selected card not found')}
            description={knownSite ? t('The selected site does not match this governorate or these filters. Clear the selection or adjust your filters.') : t('This site selection is not in the archive. You can clear it and continue browsing the current results.')}>
            <button type="button" className="hb-btn" onClick={() => update({ site: null })}>{t('Clear site selection')}</button>
          </StatePanel>}

          <div className="hb-mapx__summary">
            <div>
              <p role="status" aria-live="polite">
                <strong>{t(region?.name ?? 'All governorates')}</strong> · {t('{cards} matching · {n} with coordinates', { cards: cardsLabel(regionResults.length), n: plotted.length })}
              </p>
              {selected && (
                <p className="hb-mapx__selected-name">
                  {t('Selected:')}{' '}
                  <SmartLink className="hb-link" href={selected.href}>
                    {selected.name}
                  </SmartLink>
                </p>
              )}
            </div>
            {region && (
              <button type="button" className="hb-btn" onClick={() => selectRegion(null)}>
                {t('Show all governorates')}
              </button>
            )}
          </div>

          <p className="sr-only" role="status">
            {region ? t('{name} selected. {cards}.', { name: t(region.name), cards: cardsLabel(region.count) }) : t('No governorate selected.')}
          </p>
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
          <RegionPanel
            entry={shown}
            stats={stats}
            matching={activeCount > 0 && shown ? (matchingByRegion.get(shown.key) ?? 0) : null}
            browseHref={`/explore?${panelBrowseParams}`}
          />

          {selected && (
            <div className="hb-mapx__selected">
              <div className="hb-mapx__selected-card">
                <HeritageCard site={selected} headingLevel={2} showCta />
              </div>
              <div className="hb-mapx__selected-actions">
                <button type="button" className="hb-link hb-mapx__deselect" onClick={() => selectSite(null)}>
                  {t('Clear selection')}
                </button>
                {CAN_EDIT && (
                  <button type="button" className="hb-link hb-mapx__deselect" onClick={() => startEditing(selected)}>
                    {Number.isFinite(selected.latitude) ? t('Move this pin') : t('Place on the map')}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="hb-mapx__results">
            <h2 id="map-result-heading" className="hb-mapfirst__h2" tabIndex={-1}>
              {region ? t('{name} heritage sites', { name: t(region.name) }) : t('Heritage site results')}
            </h2>
            <p className="hb-explore__count" role="status">
              {cardsLabel(regionResults.length)}
              {plotted.length !== regionResults.length && `, ${t('{n} with coordinates', { n: plotted.length })}`}
              {` · ${t('Showing {shown} of {total}', { shown: Math.min(listSize, regionResults.length), total: regionResults.length })}`}
            </p>
            {regionResults.length > 0 ? (
              <ul className="hb-mapx__list" ref={resultList}>
                {regionResults.slice(0, listSize).map((site) => (
                  <li key={site.id}>
                    <button
                      type="button"
                      className="hb-mapx__item"
                      aria-pressed={selected?.id === site.id}
                      onClick={() => selectSite(site)}
                    >
                      <span className="hb-mapx__item-name">{site.name}</span>
                      <span className="hb-mapx__item-meta">
                        {[t(site.cardType.shortLabel), t(site.governorate)].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <StatePanel kind={activeCount > 0 ? 'no-results' : 'empty'}
                title={activeCount > 0 ? t('No cards match these filters') : t('No cards recorded here yet')}
                description={activeCount > 0 ? t('Remove a filter or choose another governorate to continue exploring.') : t('Reviewed site records will appear here when available.')}>
                {activeCount > 0 && (
                  <button type="button" className="hb-btn hb-btn--ink" onClick={clear}>
                    {t('Clear all filters')}
                  </button>
                )}
                {region && (
                  <button
                    type="button"
                    className="hb-link hb-mapx__deselect"
                    onClick={() => selectRegion(null)}
                  >
                    {t('Browse all governorates')}
                  </button>
                )}
              </StatePanel>
            )}
            {regionResults.length > listSize && (
              <button
                type="button"
                className="hb-btn hb-btn--ink"
                onClick={() => { nextResult.current = listSize; setListSize((n) => n + LIST_PAGE); }}
              >
                {t('Show more')}
              </button>
            )}
            <p className="hb-mapx__more">
              <SmartLink className="hb-link" href={`/explore?${browseParams}`}>
                {t('Browse as a list of cards')}
              </SmartLink>
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
