import '../../styles/pages.css';
import { t } from '../../i18n';

/** Removable chips for every active filter. */
export default function ActiveFilters({ filters, facets, onChange }) {
  const label = (group, id) => (facets[group] ?? []).find((o) => o.id === id)?.label ?? id;
  const chips = [
    ...(filters.q.trim()
      ? [{ key: 'q', text: `“${filters.q.trim()}”`, remove: () => onChange({ q: '' }) }]
      : []),
    ...filters.types.map((id) => ({
      key: `t${id}`,
      text: label('types', id),
      remove: () => onChange({ types: filters.types.filter((x) => x !== id) }),
    })),
    ...filters.governorates.map((id) => ({
      key: `g${id}`,
      text: label('governorates', id),
      remove: () => onChange({ governorates: filters.governorates.filter((x) => x !== id) }),
    })),
    ...filters.kinds.map((id) => ({
      key: `k${id}`,
      text: label('kinds', id),
      remove: () => onChange({ kinds: filters.kinds.filter((x) => x !== id) }),
    })),
    ...['themes', 'periods'].flatMap((group) =>
      (filters[group] ?? []).map((id) => ({
        key: `${group}-${id}`,
        text: label(group, id),
        remove: () => onChange({ [group]: filters[group].filter((x) => x !== id) }),
      })),
    ),
    ...['unesco', 'has3D']
      .filter((group) => filters[group])
      .map((group) => ({
        key: group,
        text: `${group === 'unesco' ? t('UNESCO') : t('3D')}: ${label(group, filters[group])}`,
        remove: () => onChange({ [group]: '' }),
      })),
    ...filters.flags.map((id) => ({
      key: `f${id}`,
      text: label('flags', id),
      remove: () => onChange({ flags: filters.flags.filter((x) => x !== id) }),
    })),
  ];
  if (chips.length === 0) return null;

  return (
    <ul className="hb-chips" aria-label={t('Active filters')}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            className="hb-tag"
            onClick={chip.remove}
            aria-label={t('Remove filter: {name}', { name: chip.text })}
          >
            {chip.text}
            <span aria-hidden="true">×</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
