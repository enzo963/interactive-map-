import { useMemo } from 'react';
import HeritageCard from '../components/cards/HeritageCard';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import SmartLink from '../components/common/SmartLink';
import StatePanel from '../components/common/StatePanel';
import { EvidenceReferences } from '../components/site/HeritageStory';
import { useSearchParams } from '../router/RouterContext';
import { getAllSites } from '../services/siteService';
import { isDisappearedSite, preservationLabel, PRESERVATION_STATES } from '../utils/heritageExperience';
import { searchSites } from '../utils/search';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { t, tn } from '../i18n';
import '../styles/heritage-story.css';

export default function DisappearedHeritage() {
  const [params, setParams] = useSearchParams();
  const pool = useMemo(() => getAllSites().filter(isDisappearedSite), []);
  const query = params.get('q') || '';
  const state = params.get('state') || '';
  const governorate = params.get('governorate') || '';
  const governorates = [...new Set(pool.map((site) => site.governorate).filter(Boolean))].sort();
  const results = searchSites(pool.filter((site) => (!state || (site.preservation?.verified && site.preservation.state === state))
    && (!governorate || site.governorate === governorate)), query, { includeMetadata: true });
  useDocumentTitle('Disappeared Heritage — History in Cards');
  const update = (key, value) => setParams((current) => { if (value) current.set(key, value); else current.delete(key); return current; }, { replace: true });
  const reset = () => setParams(new URLSearchParams(), { replace: false });
  return <main id="main" tabIndex={-1} className="hb-page hb-loss">
    <PageHeader eyebrow={t('Memory, evidence and preservation')} title={t('Disappeared Heritage')}
      lede={t('Explore places affected by destruction, loss or severe damage through reviewed historical evidence.')} />
    <div className="hb-container hb-loss__body">
      <div className="hb-loss__introduction"><h2>{t('A history of loss, not a claim that every place is gone')}</h2>
        <p>{t('A site may have been rebuilt or restored after destruction. Current condition is shown separately from historical events. Only approved sites with a reviewed loss assessment or destruction event enter this collection.')}</p>
        <SmartLink href="/methodology">{t('How evidence is reviewed')}</SmartLink></div>
      {pool.length > 0 && <div className="hb-loss__filters">
        <SearchField label={t('Search disappeared heritage')} value={query} onChange={(value) => update('q', value)} />
        <label>{t('Current recorded condition')}<select aria-label={t('Current recorded condition')} value={state} onChange={(event) => update('state', event.target.value)}>
          <option value="">{t('All recorded conditions')}</option>{PRESERVATION_STATES.filter((item) => item.id !== 'unknown').map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}
        </select></label>
        <label>{t('Governorate')}<select aria-label={t('Governorate')} value={governorate} onChange={(event) => update('governorate', event.target.value)}>
          <option value="">{t('All governorates')}</option>{governorates.map((name) => <option key={name} value={name}>{t(name)}</option>)}
        </select></label>
      </div>}
      {(query || state || governorate) && <button className="hb-btn" type="button" onClick={reset}>{t('Reset heritage filters')}</button>}
      <p role="status">{tn('{n} reviewed heritage record', '{n} reviewed heritage records', results.length)}</p>
      {results.length ? <div className="hb-loss__entries">{results.map((site) => {
        const losses = (site.historicalEvents || []).filter((event) => event.type === 'destruction');
        const assessment = site.preservation;
        const sources = [...(assessment?.verified ? assessment.sources : []), ...losses.flatMap((event) => event.sources)]
          .filter((source, index, all) => all.findIndex((item) => item.evidenceId === source.evidenceId) === index);
        return <article className="hb-loss__entry" key={site.id}>
          <HeritageCard site={site} headingLevel={2} showCta />
          <div className="hb-loss__context">
            <h3>{t('Current recorded condition')}</h3><p>{assessment?.verified ? t(preservationLabel(assessment.state)) : t('Unknown')} · {assessment?.verified ? t('Source-backed assessment') : t('Unverified')}</p>
            {assessment?.verified && assessment.asOf && <p>{t('Condition recorded as of')} <time dateTime={assessment.asOf}>{assessment.asOf}</time></p>}
            {assessment?.verified && assessment.summary && <p>{assessment.summary}</p>}
            {losses.length > 0 && <><h3>{t('Recorded history of destruction')}</h3><ul>{losses.map((event) => <li key={event.id}>{event.when} — {event.title}</li>)}</ul></>}
            <EvidenceReferences sources={sources} />
            <SmartLink href={`${site.href}#preservation`}>{t('Read the site record and evidence')}</SmartLink>
          </div>
        </article>;
      })}</div> : <StatePanel headingLevel={2} title={pool.length ? t('No heritage records match') : t('No reviewed loss records yet')}
        description={pool.length ? t('Try another search or reset the condition and governorate filters.') : t('This collection will appear when loss assessments or destruction events have been reviewed against historical evidence. Unverified labels are not presented as confirmed loss.')}>
        <SmartLink href="/decks">{t('Browse decks')}</SmartLink>
        <SmartLink href="/explore">{t('Explore Cards')}</SmartLink>
      </StatePanel>}
    </div>
  </main>;
}
