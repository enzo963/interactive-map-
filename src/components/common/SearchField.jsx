import { useId } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/pages.css';

export default function SearchField({ value, onChange, label, placeholder }) {
  const id = useId();
  const { t } = useI18n();
  return (
    <div className="hb-search">
      <label className="hb-search__label" htmlFor={id}>{label ?? t('search.label')}</label>
      <input
        id={id}
        className="hb-search__input"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t('search.placeholder')}
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  );
}
