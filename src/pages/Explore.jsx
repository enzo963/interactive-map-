import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import CardGrid from '../components/common/CardGrid';
import FilterPanel from '../components/explore/FilterPanel';
import ActiveFilters from '../components/explore/ActiveFilters';
import useSiteFilters from '../hooks/useSiteFilters';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/I18nContext';
import { getAllSites } from '../services/siteService';
import { SORTS, applyFilters, getFacets, sortSites } from '../utils/filterSites';
import '../styles/pages.css';

export default function Explore() {
  const { t, ls, localize, cardsLabel, pageTitle } = useI18n();
  useDocumentTitle(pageTitle(t('title.explore')));
  const sites = useMemo(() => getAllSites(), []);
  const { filters, setFilters, clear, activeCount } = useSiteFilters();
  const [panelOpen, setPanelOpen] = useState(false);

  const labels = useMemo(
    () => ({
      governorate: localize.governorate,
      kind: localize.kind,
      cardType: localize.cardType,
      flag: (id, label) => (id === 'video' ? t('flag.video') : t(`drawFilter.${id}`)) || label,
      compare: localize.compare,
    }),
    [localize, t],
  );
  const facets = useMemo(() => getFacets(sites, filters, labels), [sites, filters, labels]);
  const results = useMemo(
    () => sortSites(applyFilters(sites, filters), filters, { nameOf: (s) => ls(s).name, compare: localize.compare }),
    [sites, filters, ls, localize],
  );
  const defaultSort = filters.q.trim() ? 'relevance' : 'archive';

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow={t('explore.eyebrow')}
        title={t('explore.title')}
        lede={t('explore.lede')}
      />

      <div className="hb-container hb-explore">
        <aside className="hb-explore__side" aria-label={t('filters.aside')}>
          <button
            type="button"
            className="hb-explore__toggle"
            aria-expanded={panelOpen}
            aria-controls="explore-filters"
            onClick={() => setPanelOpen((open) => !open)}
          >
            {t('filters.button')}{activeCount > 0 ? ` (${activeCount})` : ''}
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
              {results.length !== sites.length
                ? t('explore.of', { shown: cardsLabel(results.length), total: sites.length })
                : cardsLabel(results.length)}
            </p>
            <label className="hb-sort">
              <span>{t('sort.label')}</span>
              <select value={filters.sort || defaultSort} onChange={(event) => setFilters({ sort: event.target.value })}>
                {filters.q.trim() && <option value="relevance">{t('sort.relevance')}</option>}
                {SORTS.map((sort) => (
                  <option value={sort.id} key={sort.id}>{t(`sort.${sort.id}`)}</option>
                ))}
              </select>
            </label>
          </div>

          <h2 className="sr-only">{t('explore.results')}</h2>
          {results.length > 0 ? (
            <CardGrid key={JSON.stringify(filters)} sites={results} />
          ) : (
            <div className="hb-empty">
              <p className="hb-empty__title">{t('explore.noneTitle')}</p>
              <p>{t('explore.noneHint')}</p>
              <button type="button" className="hb-btn hb-btn--ink" onClick={clear}>{t('filters.clear')}</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
