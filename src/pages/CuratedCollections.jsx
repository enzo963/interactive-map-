import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import StatePanel from '../components/common/StatePanel';
import CardGrid from '../components/common/CardGrid';
import SearchField from '../components/common/SearchField';
import ActiveFilters from '../components/explore/ActiveFilters';
import DeckTile from '../components/decks/DeckTile';
import DeckPile from '../components/decks/DeckPile';
import MediaAttribution from '../components/site/MediaAttribution';
import { Sources } from '../components/site/SiteSections';
import NotFound from './NotFound';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useSiteFilters from '../hooks/useSiteFilters';
import { getAllSites } from '../services/siteService';
import { getCuratedCollection, getCuratedCollections } from '../data/curatedCollections';
import { applyFilters, getFacets, serializeFilters, sortSites } from '../utils/filterSites';
import { approvedCover } from '../utils/coverApproval';
import { mediaLicenseState } from '../utils/mediaAttribution';
import { isCredibleSource } from '../utils/sourceCredibility';
import { t, tn } from '../i18n';
import '../styles/curated-collections.css';

function CollectionCover({ media, site, collection }) {
  const [failed, setFailed] = useState(false);
  return media && !failed ? (
    <figure className="hb-curated__cover">
      <img src={media.src} alt={media.alt || site.name} decoding="async" onError={() => setFailed(true)} />
      <figcaption>
        <SmartLink href={site.href}>{site.name}</SmartLink>
        <MediaAttribution media={media} image />
      </figcaption>
    </figure>
  ) : (
    <figure className="hb-curated__illustration">
      <div aria-hidden="true"><DeckPile variant={collection.back} label={t(collection.title)} /></div>
      <figcaption>{t('Collection illustration')}</figcaption>
    </figure>
  );
}

function CollectionPage({ id }) {
  const collection = useMemo(() => getCuratedCollection(getAllSites(), id), [id]);
  const { filters, setFilters, clear, activeCount } = useSiteFilters();
  const title = collection ? t(collection.title) : t('Collection not found');
  useDocumentTitle(`${title} — History in Cards`);
  if (!collection) return <NotFound title={title} message={t('That curated collection is not in the archive.')} />;

  const results = sortSites(applyFilters(collection.sites, filters), filters);
  const facets = getFacets(collection.sites, filters);
  const coverSite = collection.sites.find((site) => {
    const media = approvedCover(site);
    return media && mediaLicenseState(media) === 'verified';
  });
  const media = coverSite ? approvedCover(coverSite) : null;
  const references = [...new Map(collection.sites.flatMap((site) => site.sources)
    .filter((source) => source.evidenceId && isCredibleSource(source))
    .map((source) => [source.url, source])).values()].slice(0, 8);
  const mapParams = serializeFilters(filters);
  mapParams.set('collection', id);

  return <main id="main" tabIndex={-1} className="hb-page hb-curated">
    <PageHeader eyebrow={t('Curated collections')} title={title} lede={t(collection.blurb)} />
    <div className="hb-container hb-curated__body">
      <div className="hb-curated__overview">
        <div className="hb-curated__actions">
          <p>{tn('{n} approved site', '{n} approved sites', collection.count)}</p>
          <SmartLink className="hb-btn hb-btn--ink" href={`/map?${mapParams}`}>{t('View collection on map')}</SmartLink>
          <SmartLink className="hb-link" href="/collections">{t('Browse curated collections')}</SmartLink>
        </div>
        <CollectionCover key={media?.src || id} media={media} site={coverSite} collection={collection} />
      </div>
      <section aria-labelledby="collection-sites">
        <h2 id="collection-sites" className="hb-section-title">{t('Sites in this collection')}</h2>
        {collection.count > 0 && <>
          <SearchField value={filters.q} onChange={(q) => setFilters({ q })} label={t('Search this collection')} suggestionSites={collection.sites} />
          <ActiveFilters filters={filters} facets={facets} onChange={setFilters} />
          {activeCount > 0 && <p role="status">{tn('{n} matching site', '{n} matching sites', results.length)}</p>}
        </>}
        {results.length > 0 ? <CardGrid key={serializeFilters(filters).toString()} sites={results} headingLevel={3} /> : (
          <StatePanel headingLevel={3} kind={collection.count ? 'no-results' : 'empty'}
            title={collection.count ? t('No cards match these filters') : t('No approved sites in this collection yet')}
            description={collection.count ? t('Clear your filters to see all collection members.') : t('Reviewed site records will appear here when available.')}>
            {activeCount > 0 && <button type="button" className="hb-btn" onClick={clear}>{t('Clear all filters')}</button>}
            <SmartLink className="hb-link" href="/collections">{t('Browse curated collections')}</SmartLink>
          </StatePanel>
        )}
      </section>
      {references.length > 0 && <section aria-labelledby="collection-references">
        <h2 id="collection-references" className="hb-section-title">{t('Selected references from member records')}</h2>
        <Sources items={references} />
      </section>}
    </div>
  </main>;
}

function CollectionIndex() {
  const collections = useMemo(() => getCuratedCollections(getAllSites()), []);
  useDocumentTitle('Curated collections — History in Cards');
  return <main id="main" tabIndex={-1} className="hb-page hb-curated">
    <PageHeader eyebrow={t('Heritage collections')} title={t('Curated collections')}
      lede={t('Explore approved heritage sites grouped by history, place, architecture and documentation.')} />
    <section className="hb-container hb-curated__body" aria-labelledby="curated-list-title">
      <h2 id="curated-list-title" className="hb-section-title">{t('Explore the collections')}</h2>
      <ul className="hb-tiles">{collections.map((collection) => <DeckTile deck={collection} key={collection.id} />)}</ul>
    </section>
  </main>;
}

export default function CuratedCollections({ params }) {
  return params.collectionId ? <CollectionPage id={params.collectionId} /> : <CollectionIndex />;
}
