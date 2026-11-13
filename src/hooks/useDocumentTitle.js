import { useEffect } from 'react';
import { currentLocale, t } from '../i18n';
import { metadataForLocation } from '../seo/context';
import { applyMetadata } from '../seo/head';

/** Owns page metadata while retaining translated browser/preview titles. */
export default function useDocumentTitle(title, { unavailable = false } = {}) {
  const translated = t(title);
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname;
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const locale = { en: 'en_US', de: 'de_DE' }[currentLocale()] || 'en_US';
  useEffect(() => {
    const meta = metadataForLocation(pathname, search, import.meta.env.VITE_SITE_URL || '', unavailable);
    applyMetadata(document, { ...meta, title: translated, locale });
  }, [translated, pathname, search, locale, unavailable]);
}
