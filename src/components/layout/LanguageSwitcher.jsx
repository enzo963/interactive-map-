import { useId } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { LANGUAGES } from '../../i18n/languages';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const id = useId();

  return (
    <div className="hb-lang">
      <label className="sr-only" htmlFor={id}>{t('tools.language')}</label>
      <select id={id} className="hb-lang__select" value={lang} onChange={(event) => setLang(event.target.value)}>
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.code} aria-label={language.label}>
            {language.code.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
