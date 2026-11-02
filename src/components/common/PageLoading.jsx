import StatePanel from './StatePanel';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useEffect } from 'react';

export default function PageLoading() {
  useDocumentTitle('Loading page — History in Cards');
  useEffect(() => { document.getElementById('main')?.focus({ preventScroll: true }); }, []);
  return <main id="main" tabIndex={-1} className="hb-page hb-route-loading">
    <div className="hb-container"><StatePanel kind="loading" title="Loading page" headingLevel={1}
      description="Preparing this part of the archive. Navigation and search remain available." /></div>
  </main>;
}
