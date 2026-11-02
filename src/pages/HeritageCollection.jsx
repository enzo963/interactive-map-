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

export default function HeritageCollection({ kind = 'unesco' }) {
  const digital = kind === '3d';
  const title = digital ? '3D Heritage Collection' : 'UNESCO World Heritage Collection';
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
        eyebrow="Heritage collections"
        title={title}
        lede={
          digital
            ? 'Explore approved sites with verified 3D models and digital reconstruction resources.'
            : 'Explore World Heritage properties represented in the approved archive. Tentative-list places and component monuments are not counted as separately inscribed properties.'
        }
      />
      <div className="hb-container hb-collection__body">
        <nav className="hb-collection__nav" aria-label="Heritage collections">
          <SmartLink href="/unesco" aria-current={!digital ? 'page' : undefined}>
            UNESCO heritage
          </SmartLink>
          <SmartLink href="/3d-archive" aria-current={digital ? 'page' : undefined}>
            3D heritage
          </SmartLink>
          <SmartLink href="/explore">All heritage sites</SmartLink>
        </nav>
        <div className="hb-collection__stats">
          <p>
            <strong>{sites.length}</strong> {sites.length === 1 ? 'site' : 'sites'}
          </p>
          <p>
            <strong>{governorates}</strong> {governorates === 1 ? 'governorate' : 'governorates'}
          </p>
        </div>
        {sites.length > 0 && (
          <>
            <SearchField
              value={filters.q}
              onChange={(q) => setFilters({ q })}
              label={`Search ${digital ? '3D' : 'UNESCO'} heritage`}
            />
            <p role="status">
              {results.length} matching {results.length === 1 ? 'site' : 'sites'}
            </p>
          </>
        )}
        {results.length ? (
          <CardGrid key={filters.q} sites={results} headingLevel={2} />
        ) : (
          <StatePanel kind={sites.length ? 'no-results' : 'empty'}
            title={sites.length
                ? 'No sites match your search'
                : digital
                  ? 'No verified 3D resources yet'
                  : 'No approved World Heritage properties yet'}
            description={sites.length
                ? 'Try a site name or alternative name.'
                : digital
                  ? 'The archive does not currently contain approved models or reconstruction resources. Sites will appear here after verification.'
                  : 'Only approved records with confirmed World Heritage inscription appear in this collection.'}>
            {filters.q && (
              <button className="hb-btn" type="button" onClick={() => setFilters({ q: '' })}>
                Clear search
              </button>
            )}
            <SmartLink className="hb-link" href="/explore">
              Explore all heritage sites
            </SmartLink>
          </StatePanel>
        )}
      </div>
    </main>
  );
}
