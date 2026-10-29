import SmartLink from '../common/SmartLink';
import { cardsLabel } from '../../utils/archiveStats';
import '../../styles/phase4.css';

function Bars({ items, label }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="hb-bars" aria-label={label}>
      {items.map((item) => (
        <li key={item.label}>
          <span className="hb-bars__label">{item.label}</span>
          <span className="hb-bars__bar" style={{ '--w': `${(item.count / max) * 100}%` }} aria-hidden="true" />
          <b className="hb-bars__count">{item.count}</b>
        </li>
      ))}
    </ul>
  );
}

/**
 * Statistics for one governorate, or an archive summary when none is chosen.
 * Every number is derived from the dataset.
 */
export default function RegionPanel({ entry, stats, matching = null }) {
  if (!entry) {
    const represented = stats.list.filter((e) => e.represented).length;
    const total = stats.list.reduce((sum, e) => sum + e.count, 0);
    return (
      <section className="hb-regionpanel" aria-labelledby="region-title">
        <h2 id="region-title" className="hb-regionpanel__title">All governorates</h2>
        <p className="hb-regionpanel__count">{cardsLabel(total)}</p>
        <p className="hb-regionpanel__text">
          {represented} of {stats.list.length} governorates have cards in the archive. Choose one to see its statistics.
        </p>
      </section>
    );
  }

  const { digital } = entry;
  const facts = [
    ['UNESCO', digital.unesco],
    ['3D models', digital.models],
    ['Videos', digital.videos],
    ['Documented by the project', digital.documented],
  ].filter(([, n]) => n > 0);

  return (
    <section className="hb-regionpanel" aria-labelledby="region-title">
      <h2 id="region-title" className="hb-regionpanel__title">{entry.name}</h2>
      <p className="hb-regionpanel__count">{cardsLabel(entry.count)}</p>
      {matching !== null && entry.count > 0 && <p className="hb-regionpanel__text">{matching} match the current filters.</p>}

      {entry.represented ? (
        <>
          {entry.types.length > 0 && (<><h3 className="hb-regionpanel__h">By card type</h3><Bars items={entry.types} label="Cards by type" /></>)}
          {entry.kinds.length > 0 && (<><h3 className="hb-regionpanel__h">By site type</h3><Bars items={entry.kinds.slice(0, 6)} label="Cards by site type" /></>)}
          {facts.length > 0 && (
            <dl className="hb-regionpanel__facts">
              {facts.map(([label, n]) => (<div key={label}><dt>{label}</dt><dd>{n}</dd></div>))}
            </dl>
          )}
          <SmartLink className="hb-btn hb-btn--ink" href={entry.href}>Open {entry.name} Deck</SmartLink>
        </>
      ) : (
        <p className="hb-regionpanel__text">No cards have been recorded for this governorate yet.</p>
      )}
    </section>
  );
}
