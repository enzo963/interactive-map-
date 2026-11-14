import { useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import SmartLink from '../components/common/SmartLink';
import StatePanel from '../components/common/StatePanel';
import ModelMetadata from '../components/site/ModelMetadata';
import MediaAttribution from '../components/site/MediaAttribution';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useSearchParams } from '../router/RouterContext';
import { getAllSites } from '../services/siteService';
import { getModelLibrary, searchModelLibrary } from '../utils/modelResources';
import { normalizeSearchText } from '../utils/search';
import { t, tn } from '../i18n';
import '../styles/model-library.css';

const unknown = '__unknown__';
const valueOf = (value) => value || unknown;
export default function ThreeDArchive() {
  useDocumentTitle('3D Model Library — History in Cards');
  const entries = useMemo(() => getModelLibrary(getAllSites()), []);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const format = params.get('format') || '';
  const method = params.get('method') || '';
  const governorate = params.get('governorate') || '';
  const results = searchModelLibrary(entries, query).filter(({ site, resource }) =>
    (!format || normalizeSearchText(valueOf(resource.format)) === normalizeSearchText(format))
    && (!method || normalizeSearchText(valueOf(resource.creationMethod)) === normalizeSearchText(method))
    && (!governorate || normalizeSearchText(valueOf(site.governorate)) === normalizeSearchText(governorate)));
  const update = (key, value) => setParams((current) => {
    if (value) current.set(key, value); else current.delete(key);
    return current;
  }, { replace: key === 'q' });
  const reset = () => setParams(new URLSearchParams(), { replace: false });
  const hasFilters = Boolean(query || format || method || governorate);
  const selector = (label, key, value, options) => <label>{label}
    <select aria-label={label} value={value} onChange={(event) => update(key, event.target.value)}>
      <option value="">{t('All values')}</option>
      {value && !options.includes(value) && <option value={value}>{value === unknown ? t('Not recorded') : value}</option>}
      {options.map((option) => <option key={option} value={option}>{option === unknown ? t('Not recorded') : t(option)}</option>)}
    </select>
  </label>;
  const options = (getter) => [...new Set(entries.map((entry) => valueOf(getter(entry))))].sort();
  return <main id="main" tabIndex={-1} className="hb-page hb-model-library">
    <PageHeader eyebrow={t('Heritage collections')} title={t('3D Model Library')}
      lede={t('Find verified heritage models and reconstructions, explore their metadata, and open the corresponding site record.')} />
    <div className="hb-container hb-model-library__body">
      <p>{tn('{n} verified model resource', '{n} verified model resources', entries.length)} · {tn('{n} heritage site', '{n} heritage sites', new Set(entries.map((entry) => entry.site.id)).size)}</p>
      <SearchField suggestions={false} value={query} onChange={(value) => update('q', value)} label={t('Search 3D models, creators or methods')} />
      <div className="hb-model-library__filters">
        {selector(t('Format'), 'format', format, options(({ resource }) => resource.format))}
        {selector(t('Creation method'), 'method', method, options(({ resource }) => resource.creationMethod))}
        {selector(t('Governorate'), 'governorate', governorate, options(({ site }) => site.governorate))}
      </div>
      <p role="status">{tn('{n} matching model resource', '{n} matching model resources', results.length)}</p>
      {hasFilters && <button type="button" className="hb-btn" onClick={reset}>{t('Reset model filters')}</button>}
      {results.length ? <div className="hb-model-library__entries">
        {results.map(({ key, site, resource }) => <article className="hb-model-library__entry" key={key}>
          <h2>{resource.title}</h2>
          <p><SmartLink href={`${site.href}#model`}>{site.name}</SmartLink> · {t(site.governorate)}</p>
          <p>{[resource.creator, resource.creationMethod, resource.format].filter(Boolean).join(' · ') || t('Not recorded')}</p>
          <ModelMetadata resource={resource} />
          <div className="hb-model-library__actions">
            <SmartLink className="hb-link" href={`${site.href}#model`}>{t('View at heritage site')}</SmartLink>
            <a className="hb-link" href={resource.url} target="_blank" rel="noopener noreferrer">{t('Open model resource')}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
          </div>
          <MediaAttribution media={resource} />
        </article>)}
      </div> : <StatePanel kind={entries.length ? 'no-results' : 'empty'}
        title={entries.length ? t('No models match these filters') : t('No verified 3D resources yet')}
        description={entries.length ? t('Try a model title, site name, creator or creation method.') : t('The archive does not currently contain approved models or reconstruction resources. Sites will appear here after verification.')}>
        <SmartLink className="hb-link" href="/explore">{t('Explore all heritage sites')}</SmartLink>
      </StatePanel>}
    </div>
  </main>;
}
