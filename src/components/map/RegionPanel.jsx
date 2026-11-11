import SmartLink from '../common/SmartLink';
import { cardsLabel } from '../../utils/archiveStats';
import '../../styles/phase4.css';
import { t } from '../../i18n';

function Bars({ items, label }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="hb-bars" aria-label={label}>
      {items.map((item) => (
        <li key={item.label}>
          <span className="hb-bars__label">{t(item.label)}</span>
          <span
            className="hb-bars__bar"
            style={{ '--w': `${(item.count / max) * 100}%` }}
            aria-hidden="true"
          />
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
export default function RegionPanel({ entry, stats, matching = null, browseHref }) {
  if (!entry) {
    const represented = stats.list.filter((e) => e.represented).length;
    const total = stats.list.reduce((sum, e) => sum + e.count, 0);
    return (
      <section className="hb-regionpanel" aria-labelledby="region-title">
        <h2 id="region-title" className="hb-regionpanel__title">
          {t('All governorates')}
        </h2>
        <p className="hb-regionpanel__count">{cardsLabel(total)}</p>
        <p className="hb-regionpanel__text">
          {t('{n} of {total} governorates have cards in the archive. Choose one to see its statistics.', { n: represented, total: stats.list.length })}
        </p>
      </section>
    );
  }

  const { digital } = entry;
  const facts = [
    [t('UNESCO'), digital.unesco],
    [t('3D models'), digital.models],
    [t('Videos'), digital.videos],
    [t('Documented by the project'), digital.documented],
  ].filter(([, n]) => n > 0);

  return (
    <section className="hb-regionpanel" aria-labelledby="region-title">
      <h2 id="region-title" className="hb-regionpanel__title">
        {t(entry.name)}
      </h2>
      <p className="hb-regionpanel__count">{cardsLabel(entry.count)}</p>
      {matching !== null && entry.count > 0 && (
        <p className="hb-regionpanel__text">{t('{n} match the current filters.', { n: matching })}</p>
      )}

      {entry.represented ? (
        <>
          {entry.types.length > 0 && (
            <>
              <h3 className="hb-regionpanel__h">{t('By card type')}</h3>
              <Bars items={entry.types} label={t('Cards by type')} />
            </>
          )}
          {entry.kinds.length > 0 && (
            <>
              <h3 className="hb-regionpanel__h">{t('By site type')}</h3>
              <Bars items={entry.kinds.slice(0, 6)} label={t('Cards by site type')} />
            </>
          )}
          {facts.length > 0 && (
            <dl className="hb-regionpanel__facts">
              {facts.map(([label, n]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          )}
          {browseHref && (
            <SmartLink className="hb-btn hb-btn--ink" href={browseHref}>
              {t('Browse {name} heritage', { name: t(entry.name) })}
            </SmartLink>
          )}
          <SmartLink className="hb-link" href={entry.href}>
            {t('Open {name} Deck', { name: t(entry.name) })}
          </SmartLink>
        </>
      ) : (
        <p className="hb-regionpanel__text">{t('No cards have been recorded for this governorate yet.')}</p>
      )}
    </section>
  );
}
