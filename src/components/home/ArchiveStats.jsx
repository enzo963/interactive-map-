import { formatCount } from '../../utils/archiveStats';

/** Headline archive numbers. Receives derived stats; hard-codes nothing. */
export default function ArchiveStats({ stats }) {
  const items = [
    { value: stats.cards, label: 'Cards' },
    { value: stats.types, label: 'Types' },
    { value: stats.governorates, label: 'Governorates' },
    { value: stats.models, label: 'Digital Models' },
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
