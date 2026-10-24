import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import CardGrid from '../components/common/CardGrid';
import FilterPanel from '../components/explore/FilterPanel';
import ActiveFilters from '../components/explore/ActiveFilters';
import useSiteFilters from '../hooks/useSiteFilters';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { SORTS, applyFilters, getFacets, sortSites } from '../utils/filterSites';
import { cardsLabel } from '../utils/archiveStats';
import '../styles/pages.css';

export default function Explore() {
  useDocumentTitle('Explore Cards — Heritage Bridge');
  const sites = useMemo(() => getAllSites(), []);
  const { filters, setFilters, clear, activeCount } = useSiteFilters();
  const [panelOpen, setPanelOpen] = useState(false);

  const facets = useMemo(() => getFacets(sites, filters), [sites, filters]);
  const results = useMemo(() => sortSites(applyFilters(sites, filters), filters), [sites, filters]);
  const defaultSort = filters.q.trim() ? 'relevance' : 'archive';

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow="Explore Cards"
        title="Search the archive"
        lede="Every record is a card. Search by name, place, period or archive number, then narrow by type, governorate and digital assets."
      />

      <div className="hb-container hb-explore">
        <aside className="hb-explore__side" aria-label="Filters">
          <button
            type="button"
            className="hb-explore__toggle"
            aria-expanded={panelOpen}
            aria-controls="explore-filters"
            onClick={() => setPanelOpen((open) => !open)}
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <div id="explore-filters" className={`hb-explore__panel ${panelOpen ? 'is-open' : ''}`.trim()}>
            <FilterPanel facets={facets} filters={filters} onChange={setFilters} onClear={clear} activeCount={activeCount} />
          </div>
        </aside>

        <div className="hb-explore__main">
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} />
          <ActiveFilters filters={filters} facets={facets} onChange={setFilters} />

          <div className="hb-explore__bar">
            <p className="hb-explore__count" role="status">
              {cardsLabel(results.length)}
              {results.length !== sites.length && ` of ${sites.length}`}
            </p>
            <label className="hb-sort">
              <span>Sort by</span>
              <select value={filters.sort || defaultSort} onChange={(event) => setFilters({ sort: event.target.value })}>
                {filters.q.trim() && <option value="relevance">Relevance</option>}
                {SORTS.map((sort) => (
                  <option value={sort.id} key={sort.id}>{sort.label}</option>
                ))}
              </select>
            </label>
          </div>

          <h2 className="sr-only">Results</h2>
          {results.length > 0 ? (
            <CardGrid key={JSON.stringify(filters)} sites={results} />
          ) : (
            <div className="hb-empty">
              <p className="hb-empty__title">No cards match these filters.</p>
              <p>Try a different spelling, or remove a filter.</p>
              <button type="button" className="hb-btn hb-btn--ink" onClick={clear}>Clear all filters</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
