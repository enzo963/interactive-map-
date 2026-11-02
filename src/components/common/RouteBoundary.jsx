import { Component, useEffect } from 'react';
import PageHeader from './PageHeader';
import StatePanel from './StatePanel';
import SmartLink from './SmartLink';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import '../../styles/pages.css';

function UnavailablePage() {
  useDocumentTitle('Content unavailable — History in Cards');
  useEffect(() => { document.getElementById('main')?.focus({ preventScroll: true }); }, []);
  return <main id="main" tabIndex={-1} className="hb-page">
    <PageHeader eyebrow="Please try again" title="Content unavailable" lede="This page could not be displayed. A connection problem or an outdated page download may be responsible." />
    <div className="hb-container"><StatePanel kind="error" title="Try loading this page again" description="Reload to request the latest page, or return to the archive. Your browser address keeps this page’s filters and selection.">
      <button type="button" className="hb-btn hb-btn--ink" onClick={() => window.location.reload()}>Reload page</button>
      <SmartLink href="/explore" className="hb-link">Explore Cards</SmartLink>
      <SmartLink href="/" className="hb-link">Home</SmartLink>
    </StatePanel></div>
  </main>;
}

/** A pathname-keyed boundary allows navigation to a healthy page after failure. */
export default class RouteBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <UnavailablePage /> : this.props.children; }
}
