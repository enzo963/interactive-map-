import { useEffect } from 'react';
import { currentLocale, t } from '../i18n';
import { metadataForLocation } from '../seo/context';
import { applyMetadata } from '../seo/head';
import { appPathname } from '../utils/basePath';

/** Owns page metadata while retaining translated browser/preview titles. */
export default function useDocumentTitle(title, { unavailable = false } = {}) {
  const translated = t(title);
  const pathname = typeof window === 'undefined' ? '/' : appPathname(window.location.pathname);
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const locale = { en: 'en_US', de: 'de_DE', ar: 'ar_IQ' }[currentLocale()] || 'en_US';
  useEffect(() => {
    const meta = metadataForLocation(pathname, search, import.meta.env.VITE_SITE_URL || '', unavailable, undefined, import.meta.env.BASE_URL);
    applyMetadata(document, { ...meta, title: translated, locale });
  }, [translated, pathname, search, locale, unavailable]);
}
