import { useId } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { LANGUAGES } from '../../i18n/languages';

function GlobeIcon() {
  return (
    <svg className="hb-lang__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
      </g>
    </svg>
  );
}

/** Each language is written in its own language, so it can always be found. */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const id = useId();

  return (
    <div className="hb-lang">
      <label className="sr-only" htmlFor={id}>{t('tools.language')}</label>
      <GlobeIcon />
      <select id={id} className="hb-lang__select" value={lang} onChange={(event) => setLang(event.target.value)}>
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </div>
  );
}
