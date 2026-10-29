/** Supported interface languages. Add a language here, then add a file in ./messages. */
export const LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en', dir: 'ltr' },
  { code: 'ar', label: 'العربية', locale: 'ar', dir: 'rtl' },
  { code: 'de', label: 'Deutsch', locale: 'de', dir: 'ltr' },
];

export const DEFAULT_LANGUAGE = 'en';

export const isSupportedLanguage = (code) => LANGUAGES.some((language) => language.code === code);

export const getLanguage = (code) => LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
