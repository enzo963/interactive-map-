import { useId } from 'react';
import '../../styles/pages.css';

export default function SearchField({
  value,
  onChange,
  label = 'Search heritage sites',
  placeholder = 'Site name, alternative name or place',
}) {
  const id = useId();
  return (
    <div className="hb-search">
      <label className="hb-search__label" htmlFor={id}>
        {label}
      </label>
      <div className="hb-search__control">
        <input
          id={id}
          className="hb-search__input"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck="false"
        />
        {value && (
          <button
            type="button"
            className="hb-search__clear"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              document.getElementById(id)?.focus();
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
