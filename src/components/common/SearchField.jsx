import { useId } from 'react';
import '../../styles/pages.css';

export default function SearchField({ value, onChange, label = 'Search cards', placeholder = 'Name, place, period, archive number' }) {
  const id = useId();
  return (
    <div className="hb-search">
      <label className="hb-search__label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="hb-search__input"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  );
}
