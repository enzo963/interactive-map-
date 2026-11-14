import { useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import CardGrid from '../components/common/CardGrid';
import SearchField from '../components/common/SearchField';
import SmartLink from '../components/common/SmartLink';
import CivilizationEmblem, { PeriodEmblems } from '../components/common/CivilizationEmblem';
import StatePanel from '../components/common/StatePanel';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useSearchParams } from '../router/RouterContext';
import { getAllSites } from '../services/siteService';
import { getHistoryGroups, getHistorySites, getUnplacedHistorySites, getRecordedPeriods, matchesRecordedPeriod } from '../utils/history';
import { searchSites } from '../utils/search';
import { t, tn } from '../i18n';
import '../styles/history.css';

export default function HistoryBrowse({ mode = 'timeline', eraId }) {
  const [params, setParams] = useSearchParams();
  const approved = useMemo(() => getHistorySites(getAllSites()), []);
  const groups = useMemo(() => getHistoryGroups(approved), [approved]);
  const unplaced = useMemo(() => getUnplacedHistorySites(approved), [approved]);
  const overview = mode === 'overview';
  const timeline = mode === 'timeline';
  const selected = timeline ? params.get('era') || 'all' : eraId;
  const group = groups.find((item) => item.id === selected);
  const invalid = timeline && !['all', 'unplaced'].includes(selected) && !group;
  const pool = selected === 'all' ? approved : selected === 'unplaced' ? unplaced : group?.sites || [];
  const period = params.get('period') || '';
  const query = params.get('q') || '';
  const periods = getRecordedPeriods(pool);
  const results = searchSites(period ? pool.filter((site) => matchesRecordedPeriod(site, period)) : pool, query, { includeMetadata: true });
  const title = overview ? t('Civilizations & Eras') : timeline ? t('Heritage Timeline') : t(group?.label);
  const selectedTitle = selected === 'all' ? t('All approved records') : selected === 'unplaced' ? t('Other or unrecorded periods') : t(group?.label);
  useDocumentTitle(`${title} — History in Cards`);

  const update = (key, value, replace = true) => setParams((current) => {
    if (value) current.set(key, value); else current.delete(key);
    if (key === 'era') current.delete('period');
    return current;
  }, { replace });
  const reset = () => setParams(new URLSearchParams(), { replace: false });
  const eraChoices = [
    { id: 'all', label: 'All approved records', sites: approved },
    ...groups,
    { id: 'unplaced', label: 'Other or unrecorded periods', sites: unplaced },
  ];

  return <main id="main" tabIndex={-1} className="hb-page hb-history">
    <PageHeader eyebrow={t('Explore through history')} title={<>{!timeline && !overview && <CivilizationEmblem eraId={group?.id} />}{title}</>}
      lede={t('Explore approved heritage records through their recorded periods and civilizations.')} />
    <div className="hb-container hb-history__body">
      <nav className="hb-history__nav" aria-label={t('Historical exploration')}>
        <SmartLink href="/timeline" aria-current={timeline ? 'page' : undefined}>{t('Timeline')}</SmartLink>
        <SmartLink href="/civilizations" aria-current={overview ? 'page' : undefined}>{t('Civilizations & Eras')}</SmartLink>
        <SmartLink href="/explore">{t('Explore Cards')}</SmartLink>
      </nav>
      <p className="hb-history__note">{t('The sequence is a broad guide, not a scale of exact dates. Periods overlap, and a multi-period site can appear in more than one era. Grouping uses recorded labels, not an inferred founding date.')}</p>
      <p className="hb-history__note">{t('Emblems are original project graphics for navigation, not authenticated historical symbols.')}</p>
      {overview ? <>
        <h2>{t('Choose a civilization or era')}</h2>
        <ul className="hb-history__tiles">
          {groups.map((item) => <li key={item.id}>
            <h3><SmartLink href={`/civilizations/${item.id}`}><CivilizationEmblem eraId={item.id} />{t(item.label)}</SmartLink></h3>
            <p>{tn('{n} approved record', '{n} approved records', item.sites.length)}</p>
            {item.sites.length === 0 && <p className="hb-history__note">{t('No approved records for this era yet')}</p>}
          </li>)}
        </ul>
        <SmartLink href="/timeline?era=unplaced">{t('Browse other or unrecorded periods')} ({unplaced.length})</SmartLink>
      </> : <div className={`hb-history__layout${timeline ? '' : ' hb-history__layout--single'}`}>
        {timeline && <nav className="hb-history__rail" aria-label={t('Choose a historical era')}>
          <ol className="hb-history__eras">
            {eraChoices.map((item) => <li key={item.id}>
              <button type="button" data-era={item.id} aria-pressed={selected === item.id}
                aria-controls="history-results" onClick={() => update('era', item.id === 'all' ? '' : item.id, false)}>
                <span><CivilizationEmblem eraId={item.id} />{t(item.label)}</span><span>{tn('{n} record', '{n} records', item.sites.length)}</span>
              </button>
            </li>)}
          </ol>
        </nav>}
        <section id="history-results" className="hb-history__results" aria-labelledby="history-results-title">
          <h2 id="history-results-title">{!invalid && <CivilizationEmblem eraId={selected} />}{invalid ? t('Era not found') : selectedTitle}</h2>
          {!invalid && pool.length > 0 && <div className="hb-history__filters">
            <SearchField value={query} onChange={(value) => update('q', value)} label={t('Search these historical records')} />
            <label className="hb-history__period"><span className="hb-history__period-label">
              {period ? <PeriodEmblems period={period} /> : group && <CivilizationEmblem eraId={group.id} />}{t('Recorded period or civilization')}
              </span>
              <select value={period} onChange={(event) => update('period', event.target.value, false)}>
                <option value="">{t('All recorded labels')}</option>
                {period && !periods.includes(period) && <option value={period}>{period}</option>}
                {periods.map((value) => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </label>
          </div>}
          <p role="status">{tn('{n} matching approved record', '{n} matching approved records', results.length)}</p>
          {!timeline && group?.id === 'islamic' && <p className="hb-history__note">{t('Islamic includes records explicitly labeled Islamic or Abbasid. Original period labels remain on each card.')}</p>}
          {!timeline && <SmartLink href={`/timeline?era=${group?.id}`}>{t('View this era on the timeline')}</SmartLink>}
          {results.length > 0 ? <CardGrid key={`${selected}:${period}:${query}`} sites={results} headingLevel={3} /> :
            <StatePanel kind={invalid ? 'unavailable' : pool.length ? 'no-results' : 'empty'} headingLevel={3}
              title={invalid ? t('Choose an available era') : pool.length ? t('No sites match your search') : t('No approved records for this era yet')}
              description={invalid ? t('This era is not part of the current historical exploration.') : pool.length ? t('Try a site name or alternative name.') : t('Records will appear here when approved information supports this period or civilization.')}>
              {(invalid || period || query) && <button type="button" className="hb-btn" onClick={reset}>{t('Reset history filters')}</button>}
              <SmartLink className="hb-link" href="/timeline">{t('Browse the full timeline')}</SmartLink>
            </StatePanel>}
          {results.length > 0 && (period || query) && <button type="button" className="hb-btn" onClick={reset}>{t('Reset history filters')}</button>}
        </section>
      </div>}
    </div>
  </main>;
}
