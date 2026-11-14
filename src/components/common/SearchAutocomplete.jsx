import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getAllSites } from '../../services/siteService';
import { getSearchSuggestions } from '../../utils/searchSuggestions';
import { t } from '../../i18n';
import '../../styles/search-autocomplete.css';

const TYPE_LABELS = { name: 'Site name', alias: 'Alternative name', governorate: 'Governorate', civilization: 'Civilization', category: 'Category' };

/** Controlled string input shared by archive search and the global search form. */
export default function SearchAutocomplete({ value, onChange, suggestions = true, sites, id, ...inputProps }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-suggestions`;
  const listRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(() => suggestions ? getSearchSuggestions(sites || getAllSites(), value) : [], [sites, suggestions, value]);
  const expanded = focused && !dismissed && matches.length > 0;
  const activeIndex = active < matches.length ? active : -1;
  useEffect(() => {
    const list = listRef.current;
    const option = list?.children[activeIndex];
    if (!expanded || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [expanded, activeIndex]);
  const select = (option) => {
    setDismissed(true);
    setActive(-1);
    onChange(option.value);
  };

  return (
    <div className="hb-autocomplete">
      <input
        type="search"
        autoComplete="off"
        {...inputProps}
        id={inputId}
        value={value}
        role={suggestions ? 'combobox' : undefined}
        aria-autocomplete={suggestions ? 'list' : undefined}
        aria-expanded={suggestions ? expanded : undefined}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onFocus={() => { setFocused(true); setDismissed(false); setActive(-1); }}
        onBlur={() => { setFocused(false); setActive(-1); }}
        onChange={(event) => { setDismissed(false); setActive(-1); onChange(event.target.value); }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length && !dismissed) {
            event.preventDefault();
            setDismissed(false);
            setActive((current) => event.key === 'ArrowDown'
              ? (current + 1) % matches.length
              : (current <= 0 ? matches.length - 1 : current - 1));
          } else if (event.key === 'Enter' && expanded && activeIndex >= 0) {
            event.preventDefault();
            select(matches[activeIndex]);
          } else if (event.key === 'Escape' && expanded) {
            event.preventDefault();
            event.stopPropagation();
            setDismissed(true);
            setActive(-1);
          }
        }}
      />
      {expanded && (
        <ul ref={listRef} id={listId} className="hb-autocomplete__list" role="listbox" aria-label={t('Search suggestions')}>
          {matches.map((option, index) => (
            <li
              key={`${option.type}-${option.value}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              className="hb-autocomplete__option"
              onPointerDown={(event) => event.preventDefault()}
              onPointerUp={(event) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') {
                  event.preventDefault();
                  select(option);
                }
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
              onPointerMove={() => setActive(index)}
            >
              <span>{option.value}</span>
              <small>{t(TYPE_LABELS[option.type])}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
