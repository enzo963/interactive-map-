import { useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import SearchField from '../components/common/SearchField';
import CardGrid from '../components/common/CardGrid';
import StatePanel from '../components/common/StatePanel';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useSiteFilters from '../hooks/useSiteFilters';
import { getAllSites } from '../services/siteService';
import { isApprovedSite, hasVerifiedModel } from '../utils/modelResources';
import { searchSites } from '../utils/search';
import '../styles/collections.css';
import { t, tn } from '../i18n';

export default function HeritageCollection({ kind = 'unesco' }) {
  const digital = kind === '3d';
  const title = digital ? t('3D Heritage Collection') : t('UNESCO World Heritage Collection');
  useDocumentTitle(`${title} — History in Cards`);
  const { filters, setFilters } = useSiteFilters();
  const sites = useMemo(
    () =>
      getAllSites().filter((site) =>
        digital ? hasVerifiedModel(site) : isApprovedSite(site) && site.isUnesco === true,
      ),
    [digital],
  );
  const results = searchSites(sites, filters.q, { includeMetadata: true });
  const governorates = new Set(sites.map((site) => site.governorate)).size;
  return (
    <main id="main" tabIndex={-1} className="hb-page hb-collection">
      <PageHeader
        eyebrow={t('Heritage collections')}
        title={title}
        lede={
          digital
            ? t('Explore approved sites with verified 3D models and digital reconstruction resources.')
            : t('Explore World Heritage properties represented in the approved archive. Tentative-list places and component monuments are not counted as separately inscribed properties.')
        }
      />
      <div className="hb-container hb-collection__body">
        <nav className="hb-collection__nav" aria-label={t('Heritage collections')}>
          <SmartLink href="/unesco" aria-current={!digital ? 'page' : undefined}>
            {t('UNESCO heritage')}
          </SmartLink>
          <SmartLink href="/3d-archive" aria-current={digital ? 'page' : undefined}>
            {t('3D heritage')}
          </SmartLink>
          <SmartLink href="/explore">{t('All heritage sites')}</SmartLink>
        </nav>
        <div className="hb-collection__stats">
          <p>
            <strong>{sites.length}</strong> {tn('site', 'sites', sites.length)}
          </p>
          <p>
            <strong>{governorates}</strong> {tn('governorate', 'governorates', governorates)}
          </p>
        </div>
        {sites.length > 0 && (
          <>
            <SearchField
              value={filters.q}
              onChange={(q) => setFilters({ q })}
              label={digital ? t('Search 3D heritage') : t('Search UNESCO heritage')}
            />
            <p role="status">
              {tn('{n} matching site', '{n} matching sites', results.length)}
            </p>
          </>
        )}
        {results.length ? (
          <CardGrid key={filters.q} sites={results} headingLevel={2} />
        ) : (
          <StatePanel kind={sites.length ? 'no-results' : 'empty'}
            title={sites.length
                ? t('No sites match your search')
                : digital
                  ? t('No verified 3D resources yet')
                  : t('No approved World Heritage properties yet')}
            description={sites.length
                ? t('Try a site name or alternative name.')
                : digital
                  ? t('The archive does not currently contain approved models or reconstruction resources. Sites will appear here after verification.')
                  : t('Only approved records with confirmed World Heritage inscription appear in this collection.')}>
            {filters.q && (
              <button className="hb-btn" type="button" onClick={() => setFilters({ q: '' })}>
                {t('Clear search')}
              </button>
            )}
            <SmartLink className="hb-link" href="/explore">
              {t('Explore all heritage sites')}
            </SmartLink>
          </StatePanel>
        )}
      </div>
    </main>
  );
}
