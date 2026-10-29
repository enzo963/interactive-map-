import { useI18n } from '../../i18n/I18nContext';
import { formatCount } from '../../utils/archiveStats';

/** Headline archive numbers. Receives derived stats; hard-codes nothing. */
export default function ArchiveStats({ stats }) {
  const { t } = useI18n();
  const items = [
    { value: stats.cards, label: t('stats.cards') },
    { value: stats.types, label: t('stats.types') },
    { value: stats.governorates, label: t('stats.governorates') },
    { value: stats.models, label: t('stats.models') },
  ];

  return (
    <dl className="hb-stats">
      {items.map((item) => (
        <div className="hb-stats__item" key={item.label}>
          <dt className="hb-stats__label">{item.label}</dt>
          <dd className="hb-stats__value">{formatCount(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
