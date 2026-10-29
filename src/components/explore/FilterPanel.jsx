import { useI18n } from '../../i18n/I18nContext';
import '../../styles/pages.css';

const toggle = (list, id) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

function Group({ legend, options, selected, onToggle }) {
  if (options.length === 0) return null;
  return (
    <fieldset className="hb-filters__group">
      <legend className="hb-filters__legend">{legend}</legend>
      {options.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <label className="hb-check" key={option.id}>
            <input
              type="checkbox"
              checked={checked}
              disabled={option.count === 0 && !checked}
              onChange={() => onToggle(option.id)}
            />
            <span className="hb-check__text">
              {option.label}
              {option.hint && <span className="hb-check__hint">{option.hint}</span>}
            </span>
            <span className="hb-check__count">{option.count}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Shared by Explore (sidebar) and the Map (wide). Counts reflect the other active filters. */
export default function FilterPanel({ facets, filters, onChange, onClear, activeCount, layout = 'column' }) {
  const { t } = useI18n();
  return (
    <div className={`hb-filters hb-filters--${layout}`}>
      <Group legend={t('filters.type')} options={facets.types} selected={filters.types} onToggle={(id) => onChange({ types: toggle(filters.types, id) })} />
      <Group legend={t('filters.governorate')} options={facets.governorates} selected={filters.governorates} onToggle={(id) => onChange({ governorates: toggle(filters.governorates, id) })} />
      <Group legend={t('filters.kind')} options={facets.kinds} selected={filters.kinds} onToggle={(id) => onChange({ kinds: toggle(filters.kinds, id) })} />
      <Group legend={t('filters.mustHave')} options={facets.flags} selected={filters.flags} onToggle={(id) => onChange({ flags: toggle(filters.flags, id) })} />
      {activeCount > 0 && (
        <button type="button" className="hb-filters__clear" onClick={onClear}>
          {t('filters.clear')}
        </button>
      )}
    </div>
  );
}
