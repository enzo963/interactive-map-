import { t, formatNumber } from '../../i18n';
import { safeUrl } from '../../utils/urls';
import { mediaLicenseState } from '../../utils/mediaAttribution';
import '../../styles/model-viewer.css';

/** Display the shared canonical resource record; model verification is distinct from reuse permission. */
export default function ModelMetadata({ resource = {} }) {
  const unknown = t('Not recorded');
  const sourceUrl = safeUrl(resource.sourceUrl);
  const licenseState = mediaLicenseState(resource);
  const verification = resource.verificationStatus === 'verified' ? t('Verified')
    : resource.verificationStatus === 'approved' ? t('Approved') : unknown;
  const license = licenseState === 'verified' ? resource.license || unknown
    : licenseState === 'restricted' ? t('Media use is restricted.')
      : licenseState === 'unverified' ? t('License unverified; reuse permission has not been confirmed.')
        : t('License unknown; reuse permission has not been confirmed.');
  return <details className="hb-model__information">
    <summary>{t('Model information')}</summary>
    <dl>
      <dt>{t('Title')}</dt><dd>{resource.title || unknown}</dd>
      <dt>{t('Creator')}</dt><dd>{resource.creator || unknown}</dd>
      <dt>{t('Creation method')}</dt><dd>{resource.creationMethod || unknown}</dd>
      <dt>{t('Year')}</dt><dd>{resource.year ?? unknown}</dd>
      <dt>{t('Source')}</dt><dd>{sourceUrl
        ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{resource.sourceName || sourceUrl}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
        : resource.sourceName || unknown}</dd>
      <dt>{t('License')}</dt><dd>{license}</dd>
      <dt>{t('Format')}</dt><dd>{resource.format || unknown}</dd>
      {resource.provider && <><dt>{t('Provider')}</dt><dd>{resource.provider}</dd></>}
      <dt>{t('File size')}</dt><dd>{Number.isSafeInteger(resource.fileSizeBytes) && resource.fileSizeBytes >= 0
        ? t('{n} bytes', { n: formatNumber(resource.fileSizeBytes) }) : unknown}</dd>
      <dt>{t('Verification status')}</dt><dd>{verification}</dd>
    </dl>
  </details>;
}
