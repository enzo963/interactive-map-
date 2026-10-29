import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/I18nContext';

export default function NotFound({ title, message }) {
  const { t, pageTitle } = useI18n();
  const heading = title ?? t('nf.title');
  useDocumentTitle(pageTitle(heading));
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow={t('nf.eyebrow')} title={heading} lede={message ?? t('nf.message')} />
      <div className="hb-container hb-notfound__actions">
        <SmartLink href="/explore" className="hb-btn hb-btn--ink">{t('nf.explore')}</SmartLink>
        <SmartLink href="/" className="hb-link">{t('nf.home')}</SmartLink>
      </div>
    </main>
  );
}
