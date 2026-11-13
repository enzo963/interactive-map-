import { useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import StatePanel from '../components/common/StatePanel';
import SmartLink from '../components/common/SmartLink';
import Gallery from '../components/site/Gallery';
import { MediaDetails } from '../components/site/HeritageMediaGallery';
import { getAllSites } from '../services/siteService';
import { getArchivalImages } from '../utils/heritageMedia';
import { normalizeSearchText } from '../utils/search';
import { useSearchParams } from '../router/RouterContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { t, tn } from '../i18n';
import '../styles/heritage-media.css';

export default function HistoricalImageArchive() {
  const entries = useMemo(() => getArchivalImages(getAllSites()), []);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const governorate = params.get('governorate') || '';
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  const results = entries.filter(({ site, resource }) => (!governorate || site.governorate === governorate)
    && words.every((word) => normalizeSearchText([site.name, ...(site.alternativeNames || []), site.governorate,
      resource.title, resource.description, resource.dateLabel, resource.creator, resource.credit, resource.sourceName].filter(Boolean).join(' ')).includes(word)));
  const update = (key, value) => setParams((current) => { if (value) current.set(key, value); else current.delete(key); return current; }, { replace: true });
  const reset = () => setParams(new URLSearchParams(), { replace: false });
  useDocumentTitle('Historical Image Archive — History in Cards');
  return <main id="main" tabIndex={-1} className="hb-page hb-archive">
    <PageHeader eyebrow={t('Photographs and historical evidence')} title={t('Historical Image Archive')}
      lede={t('Explore reviewed archival photographs with recorded dates, sources, licensing and links to the places they document.')} />
    <div className="hb-container hb-archive__body">
      <p>{t('Dates retain their recorded precision. An unknown date stays unknown. Reconstructions are identified separately from archival photographs.')}</p>
      {entries.length > 0 && <div className="hb-archive__filters">
        <SearchField suggestions={false} value={query} onChange={(value) => update('q', value)} label={t('Search archival images, dates or creators')} />
        <label>{t('Governorate')}<select aria-label={t('Governorate')} value={governorate} onChange={(event) => update('governorate', event.target.value)}>
          <option value="">{t('All governorates')}</option>{[...new Set(entries.map(({ site }) => site.governorate).filter(Boolean))].sort().map((name) => <option key={name} value={name}>{t(name)}</option>)}
        </select></label>
      </div>}
      {(query || governorate) && <button type="button" className="hb-btn" onClick={reset}>{t('Reset image search')}</button>}
      <p role="status">{tn('{n} archival image', '{n} archival images', results.length)}</p>
      {results.length > 0 ? <Gallery key={`${query}:${governorate}`} images={results.map(({ key, site, resource }) => ({ ...resource, key, site }))}
        renderAttribution={(resource) => <><h2 className="hb-archive__site"><SmartLink href={`${resource.site.href}#gallery`}>{resource.site.name}</SmartLink></h2>
          <MediaDetails resource={resource} image /></>} />
        : <StatePanel title={entries.length ? t('No archival images match') : t('No verified archival photographs yet')}
          description={entries.length ? t('Try a site name, recorded date, creator or governorate.') : t('Archival photographs will appear after their historical evidence, site association and publication rights have been reviewed.')}>
          <SmartLink href="/explore">{t('Explore Cards')}</SmartLink>
        </StatePanel>}
    </div>
  </main>;
}
