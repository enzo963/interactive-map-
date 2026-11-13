import { useId } from 'react';
import '../../styles/pages.css';
import { t } from '../../i18n';
import SearchAutocomplete from './SearchAutocomplete';

export default function SearchField({
  value,
  onChange,
  label = t('Search heritage sites'),
  placeholder = t('Site name, alternative name or place'),
  suggestions = true,
  suggestionSites,
}) {
  const id = useId();
  return (
    <div className="hb-search">
      <label className="hb-search__label" htmlFor={id}>
        {label}
      </label>
      <div className="hb-search__control">
        <SearchAutocomplete
          id={id}
          className="hb-search__input"
          type="search"
          value={value}
          onChange={onChange}
          suggestions={suggestions}
          sites={suggestionSites}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck="false"
        />
        {value && (
          <button
            type="button"
            className="hb-search__clear"
            aria-label={t('Clear search')}
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
