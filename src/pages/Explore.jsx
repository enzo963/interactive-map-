import { useMemo, useState } from 'react';
import DiscoveryBrowse from '../components/explore/DiscoveryBrowse';
import SmartLink from '../components/common/SmartLink';
import { getGovernorateKey, GOVERNORATE_NAMES } from '../data/governorates';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import CardGrid from '../components/common/CardGrid';
import StatePanel from '../components/common/StatePanel';
import FilterPanel from '../components/explore/FilterPanel';
import ActiveFilters from '../components/explore/ActiveFilters';
import useSiteFilters from '../hooks/useSiteFilters';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { SORTS, applyFilters, getFacets, sortSites, serializeFilters } from '../utils/filterSites';
import { cardsLabel } from '../utils/archiveStats';
import '../styles/pages.css';
import { t } from '../i18n';

export default function Explore() {
  useDocumentTitle('Explore Cards — History in Cards');
  const sites = useMemo(() => getAllSites(), []);
  const { filters, setFilters, clear, activeCount } = useSiteFilters();
  const [panelOpen, setPanelOpen] = useState(false);

  const facets = useMemo(() => getFacets(sites, filters), [sites, filters]);
  const results = useMemo(() => sortSites(applyFilters(sites, filters), filters), [sites, filters]);
  const defaultSort = filters.q.trim() ? 'relevance' : 'archive';

  const governorateKey = filters.governorates.length === 1 ? getGovernorateKey(filters.governorates[0]) : '';
  const governorateName = governorateKey
    ? (GOVERNORATE_NAMES[governorateKey] ??
      sites.find((s) => getGovernorateKey(s.governorate) === governorateKey)?.governorate ??
      filters.governorates[0])
    : '';
  const totalInGovernorate = sites.filter((s) => getGovernorateKey(s.governorate) === governorateKey).length;
  const mapParams = serializeFilters(filters);
  if (governorateKey) mapParams.set('region', governorateKey);
  const showResults = () => {
    setPanelOpen(false);
    document.getElementById('explore-results')?.focus();
  };

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow={t('Explore Cards')}
        title={governorateName ? t('{name} heritage', { name: t(governorateName) }) : t('Search the archive')}
        lede={
          governorateName
            ? t('{n} heritage sites recorded in {name}. Search or filter the collection below.', { n: totalInGovernorate, name: t(governorateName) })
            : t('Find a place by its name or alternative name, then explore its governorate, heritage category and historical period.')
        }
      />

      <DiscoveryBrowse sites={sites} />
      <div className="hb-container hb-explore">
        <aside className="hb-explore__side" aria-label={t('Filters')}>
          <button
            type="button"
            className="hb-explore__toggle"
            aria-expanded={panelOpen}
            aria-controls="explore-filters"
            onClick={() => setPanelOpen((open) => !open)}
          >
            {t('Filters')}{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <div id="explore-filters" className={`hb-explore__panel ${panelOpen ? 'is-open' : ''}`.trim()}>
            <FilterPanel
              facets={facets}
              filters={filters}
              onChange={setFilters}
              onClear={clear}
              activeCount={activeCount}
              onDone={showResults}
              resultCount={results.length}
            />
          </div>
        </aside>

        <div className="hb-explore__main">
          <div className="hb-explore__context">
            <SmartLink className="hb-link" href={`/map?${mapParams}`}>
              {governorateName ? t('View {name} on the map', { name: t(governorateName) }) : t('View these results on the map')}
            </SmartLink>
          </div>
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} />
          <ActiveFilters filters={filters} facets={facets} onChange={setFilters} />

          <div className="hb-explore__bar">
            <p className="hb-explore__count" role="status">
              {cardsLabel(results.length)}
              {results.length !== sites.length && ` ${t('of {n}', { n: sites.length })}`}
            </p>
            <label className="hb-sort">
              <span>{t('Sort by')}</span>
              <select
                value={filters.sort || defaultSort}
                onChange={(event) => setFilters({ sort: event.target.value })}
              >
                {filters.q.trim() && <option value="relevance">{t('Relevance')}</option>}
                {SORTS.map((sort) => (
                  <option value={sort.id} key={sort.id}>
                    {t(sort.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h2 id="explore-results" tabIndex={-1} className="sr-only">
            {governorateName ? t('{name} heritage results', { name: t(governorateName) }) : t('Results')}
          </h2>
          {results.length > 0 ? (
            <CardGrid key={JSON.stringify(filters)} sites={results} />
          ) : (
            <StatePanel kind={sites.length ? 'no-results' : 'empty'}
              title={!sites.length ? t('No heritage sites yet') : filters.q.trim() ? t('No sites found for “{q}”', { q: filters.q.trim() }) : t('No sites match these filters')}
              description={sites.length ? t('Try a site’s alternative name, check the spelling, or remove a filter.') : t('There are no site records in the archive yet. Reviewed records will appear here when available.')}>
              {filters.q && (
                <button type="button" className="hb-btn" onClick={() => setFilters({ q: '' })}>
                  {t('Clear search')}
                </button>
              )}
              <button type="button" className="hb-btn hb-btn--ink" onClick={clear}>
                {t('Clear all filters')}
              </button>
            </StatePanel>
          )}
        </div>
      </div>
    </main>
  );
}
