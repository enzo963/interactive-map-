import { useI18n } from '../../i18n/I18nContext';
import '../../styles/pages.css';

/** Removable chips for every active filter. */
export default function ActiveFilters({ filters, facets, onChange }) {
  const { t } = useI18n();
  const label = (group, id) => facets[group].find((o) => o.id === id)?.label ?? id;
  const chips = [
    ...(filters.q.trim() ? [{ key: 'q', text: `“${filters.q.trim()}”`, remove: () => onChange({ q: '' }) }] : []),
    ...filters.types.map((id) => ({ key: `t${id}`, text: label('types', id), remove: () => onChange({ types: filters.types.filter((x) => x !== id) }) })),
    ...filters.governorates.map((id) => ({ key: `g${id}`, text: label('governorates', id), remove: () => onChange({ governorates: filters.governorates.filter((x) => x !== id) }) })),
    ...filters.kinds.map((id) => ({ key: `k${id}`, text: label('kinds', id), remove: () => onChange({ kinds: filters.kinds.filter((x) => x !== id) }) })),
    ...filters.flags.map((id) => ({ key: `f${id}`, text: label('flags', id), remove: () => onChange({ flags: filters.flags.filter((x) => x !== id) }) })),
  ];
  if (chips.length === 0) return null;

  return (
    <ul className="hb-chips" aria-label={t('filters.active')}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <button type="button" className="hb-tag" onClick={chip.remove} aria-label={t('filters.remove', { text: chip.text })}>
            {chip.text}
            <span aria-hidden="true">×</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
