import '../../styles/pages.css';
const toggle = (list, id) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
function Group({ legend, options = [], selected = [], onToggle }) {
  if (!options.length) return null;
  return (
    <fieldset className="hb-filters__group">
      <legend className="hb-filters__legend">{legend}</legend>
      <div className="hb-filters__options">
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
      </div>
    </fieldset>
  );
}
function Status({ label, options = [], value, onChange }) {
  return (
    <label className="hb-filters__status">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">All statuses</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
      <small>“Not recorded” is different from “No”.</small>
    </label>
  );
}
export default function FilterPanel({
  facets,
  filters,
  onChange,
  onClear,
  activeCount,
  layout = 'column',
  onDone,
  resultCount,
  hideGovernorate = false,
}) {
  const group = (key, legend) => (
    <Group
      legend={legend}
      options={facets[key]}
      selected={filters[key]}
      onToggle={(id) => onChange({ [key]: toggle(filters[key] ?? [], id) })}
    />
  );
  return (
    <div className={`hb-filters hb-filters--${layout}`}>
      {!hideGovernorate && group('governorates', 'Governorate')}
      {group('themes', 'Heritage category')}
      {group('kinds', 'Site type')}
      {group('periods', 'Period or civilization')}
      <fieldset className="hb-filters__group">
        <legend className="hb-filters__legend">Status & digital access</legend>
        <Status
          label="UNESCO inscription"
          options={facets.unesco}
          value={filters.unesco}
          onChange={(unesco) => onChange({ unesco })}
        />
        <Status
          label="3D availability"
          options={facets.has3D}
          value={filters.has3D}
          onChange={(has3D) => onChange({ has3D })}
        />
      </fieldset>
      <details className="hb-filters__extra">
        <summary>More collection filters</summary>
        {group('types', 'Card type')}
        {group('flags', 'Must have')}
      </details>
      <div className="hb-filters__actions">
        {activeCount > 0 && (
          <button type="button" className="hb-filters__clear" onClick={onClear}>
            Clear all filters
          </button>
        )}
        {onDone && (
          <button type="button" className="hb-btn hb-btn--ink hb-filters__done" onClick={onDone}>
            Show {resultCount} {resultCount === 1 ? 'site' : 'sites'}
          </button>
        )}
      </div>
    </div>
  );
}
