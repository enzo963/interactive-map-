import { mediaLicenseState } from '../../utils/mediaAttribution';
import { safeUrl } from '../../utils/urls';
import { t } from '../../i18n';

/** Credit is independent of permission; uncertain license labels never become verified terms. */
export default function MediaAttribution({ media, image = false }) {
  const observations = [media, ...(Array.isArray(media.source_observations) ? media.source_observations : [])];
  const clean = (value) => typeof value === 'string' ? value.trim() : '';
  const sources = observations.filter((item) => item && typeof item === 'object').map((item) => {
    const url = safeUrl(item.sourceUrl || item.source_url);
    const name = clean(item.sourceName) || clean(item.source_name) || (url ? new URL(url).hostname : '');
    return { url, name, credit: clean(item.credit) };
  }).filter((item, index, all) => (item.url || item.name || item.credit)
    && all.findIndex((other) => other.url === item.url && other.name === item.name && other.credit === item.credit) === index);
  const state = mediaLicenseState(media);
  const licenseUrl = safeUrl(media.license_url);
  return <div className="hb-image-attribution">
    {sources.map((source, i) => <p key={i}>
      {source.credit && <span>{t('Credit:')} {source.credit}{/[.!?…]$/.test(source.credit) ? '' : '.'} </span>}
      {(source.url || source.name) && <>{t('Source:')} {source.url
        ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name || t('Media source')}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
        : source.name}</>}
    </p>)}
    {!sources.some((source) => source.credit) && <p>{t('Credit not recorded.')}</p>}
    <p>{state === 'verified' ? <>{t('License:')} {licenseUrl
      ? <a href={licenseUrl} target="_blank" rel="noopener noreferrer">{media.license}</a> : media.license}</>
      : state === 'restricted' ? (image ? t('Image use is restricted.') : t('Media use is restricted.'))
        : state === 'unverified' ? t('License unverified; reuse permission has not been confirmed.')
          : t('License unknown; reuse permission has not been confirmed.')}</p>
    {image && <p>{t('Display: scaled to fit.')}</p>}
  </div>;
}
