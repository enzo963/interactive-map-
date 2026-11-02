import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import StatePanel from '../components/common/StatePanel';
import '../styles/pages.css';
import { t } from '../i18n';

export default function NotFound({ title = 'Page not found', message = 'This address does not lead to a page in the archive. The link may be incomplete or the content may no longer be available.' }) {
  useDocumentTitle(`${t(title)} — History in Cards`);
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow="404" title={t(title)} lede={t(message)} />
      <div className="hb-container hb-notfound">
        <span className="hb-notfound__number" aria-hidden="true">404</span>
        <StatePanel kind="unavailable" title={t('There is more history to discover')}
          description={t('Search for a site by name, choose a governorate on the map, or start again from the home page.')}>
          <SmartLink href="/explore" className="hb-btn hb-btn--ink">{t('Explore Cards')}</SmartLink>
          <SmartLink href="/map" className="hb-link">{t('Open the map')}</SmartLink>
          <SmartLink href="/" className="hb-link">{t('Back to the home page')}</SmartLink>
        </StatePanel>
      </div>
    </main>
  );
}
