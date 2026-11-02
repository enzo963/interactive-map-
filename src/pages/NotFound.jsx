import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import StatePanel from '../components/common/StatePanel';
import '../styles/pages.css';

export default function NotFound({ title = 'Page not found', message = 'This address does not lead to a page in the archive. The link may be incomplete or the content may no longer be available.' }) {
  useDocumentTitle(`${title} — History in Cards`);
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow="404" title={title} lede={message} />
      <div className="hb-container hb-notfound">
        <span className="hb-notfound__number" aria-hidden="true">404</span>
        <StatePanel kind="unavailable" title="There is more history to discover"
          description="Search for a site by name, choose a governorate on the map, or start again from the home page.">
          <SmartLink href="/explore" className="hb-btn hb-btn--ink">Explore Cards</SmartLink>
          <SmartLink href="/map" className="hb-link">Open the map</SmartLink>
          <SmartLink href="/" className="hb-link">Back to the home page</SmartLink>
        </StatePanel>
      </div>
    </main>
  );
}
