import '../../styles/phase4.css';
import { t, tn } from '../../i18n';

/** Compact governorate selector: the keyboard- and screen-reader-friendly control for the map. */
export default function RegionList({ stats, selectedKey, onSelect }) {
  return (
    <div className="hb-regions" role="group" aria-label={t('Governorates')}>
      {stats.list.map((entry) => (
        <button
          type="button"
          className="hb-region"
          key={entry.key}
          aria-pressed={entry.key === selectedKey}
          data-represented={entry.represented}
          onClick={() => onSelect(entry.key === selectedKey ? null : entry.key)}
        >
          <span>{t(entry.name)}</span>
          <span className="hb-region__count">{entry.count}<span className="sr-only"> {tn('card', 'cards', entry.count)}</span></span>
        </button>
      ))}
    </div>
  );
}
