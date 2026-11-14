import { Sources } from './SiteSections';
import { preservationLabel, EVENT_TYPES } from '../../utils/heritageExperience';
import { t } from '../../i18n';
import '../../styles/heritage-story.css';

export function EvidenceReferences({ sources = [] }) {
  return sources.length > 0 ? <details className="hb-claim__evidence">
    <summary>{t('Evidence and references')}</summary><Sources items={sources} />
  </details> : null;
}

export function PreservationAssessment({ assessment }) {
  const verified = assessment?.verified === true;
  const reported = !verified && assessment?.reportedState && assessment.reportedState !== 'unknown';
  return <div className="hb-preservation">
    <p className="hb-preservation__status"><strong>{t(preservationLabel(verified ? assessment.state : reported ? assessment.reportedState : 'unknown'))}</strong>
      <span>{verified ? t('Source-backed assessment') : t('Unverified')}</span></p>
    {verified ? <>
      {assessment.asOf && <p>{t('Condition recorded as of')} <time dateTime={assessment.asOf}>{assessment.asOf}</time></p>}
      {assessment.summary && <p>{assessment.summary}</p>}
      <p className="hb-claim__note">{t('This assessment describes the recorded condition, not a live inspection. Historical damage and later restoration may both appear in the timeline.')}</p>
      <EvidenceReferences sources={assessment.sources} />
    </> : <p className="hb-claim__note">{reported
      ? t('This reported condition has not passed claim-level evidence review. It is not used as a verified preservation assessment.')
      : t('A source-backed preservation assessment has not been recorded. Unknown does not mean preserved or destroyed.')}</p>}
  </div>;
}

export function HistoricalNarrative({ section }) {
  return <div className="hb-prose hb-narrative">
    {section.text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    <EvidenceReferences sources={section.sources} />
  </div>;
}

export function SiteHistoricalTimeline({ events = [] }) {
  return <>
    <p className="hb-claim__note">{t('Only reviewed, source-backed events are shown. Gaps do not imply that nothing happened. Approximate dates are marked; this sequence is not to scale.')}</p>
    <ol className="hb-site-events">
      {events.map((event) => <li key={event.id}>
        <div className="hb-site-events__date">{event.date ? <time dateTime={event.date}>{event.when}</time> : event.when}</div>
        <div><p className="hb-eyebrow">{t(EVENT_TYPES.find((item) => item.id === event.type)?.label || 'Historical event')}</p>
          <h3>{event.title}</h3>{event.description && <p>{event.description}</p>}
          <EvidenceReferences sources={event.sources} />
        </div>
      </li>)}
    </ol>
  </>;
}
