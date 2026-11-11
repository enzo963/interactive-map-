import { useEffect } from 'react';
import { t } from '../i18n';

/** Sets the browser tab title in the interface language (titles are translation keys; see src/i18n). */
export default function useDocumentTitle(title) {
  const translated = t(title);
  useEffect(() => {
    document.title = translated;
  }, [translated]);
}
