import { Component, useEffect } from 'react';
import PageHeader from './PageHeader';
import StatePanel from './StatePanel';
import SmartLink from './SmartLink';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import '../../styles/pages.css';
import { t } from '../../i18n';

function UnavailablePage() {
  useDocumentTitle(t('Content unavailable — History in Cards'), { unavailable: true });
  useEffect(() => { document.getElementById('main')?.focus({ preventScroll: true }); }, []);
  return <main id="main" tabIndex={-1} className="hb-page">
    <PageHeader eyebrow={t('Please try again')} title={t('Content unavailable')} lede={t('This page could not be displayed. A connection problem or an outdated page download may be responsible.')} />
    <div className="hb-container"><StatePanel kind="error" title={t('Try loading this page again')} description={t('Reload to request the latest page, or return to the archive. Your browser address keeps this page’s filters and selection.')}>
      <button type="button" className="hb-btn hb-btn--ink" onClick={() => window.location.reload()}>{t('Reload page')}</button>
      <SmartLink href="/explore" className="hb-link">{t('Explore Cards')}</SmartLink>
      <SmartLink href="/" className="hb-link">{t('Home')}</SmartLink>
    </StatePanel></div>
  </main>;
}

/** A pathname-keyed boundary allows navigation to a healthy page after failure. */
export default class RouteBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <UnavailablePage /> : this.props.children; }
}
