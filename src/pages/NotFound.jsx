import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound({ title = 'Card not found', message = 'We could not find that page in the archive.' }) {
  useDocumentTitle(`${title} — Heritage Bridge`);
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow="404" title={title} lede={message} />
      <div className="hb-container hb-notfound__actions">
        <SmartLink href="/explore" className="hb-btn hb-btn--ink">Explore Cards</SmartLink>
        <SmartLink href="/" className="hb-link">Back to the home page</SmartLink>
      </div>
    </main>
  );
}
