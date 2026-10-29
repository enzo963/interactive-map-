import { useI18n } from '../../i18n/I18nContext';
import { getModelEmbed, getVideoEmbed } from '../../utils/media';
import '../../styles/site-details.css';

/** Wrapper: every optional section uses it, and the page only renders it when data exists. */
export function SiteSection({ id, title, children }) {
  return (
    <section className="hb-site__section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="hb-site__h2">{title}</h2>
      {children}
    </section>
  );
}

export function Overview({ text }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="hb-prose">
      {paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
    </div>
  );
}

export function Timeline({ items }) {
  return (
    <ol className="hb-timeline">
      {items.map((item, i) => (
        <li className="hb-timeline__item" key={i}>
          <span className="hb-timeline__when">{item.when}</span>
          <div>
            {item.title && <p className="hb-timeline__title">{item.title}</p>}
            {item.description && <p className="hb-timeline__text">{item.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ModelViewer({ url, name }) {
  const { t } = useI18n();
  const embed = getModelEmbed(url);
  if (!embed) return null;
  if (embed.type === 'iframe') {
    return (
      <div className="hb-embed">
        <iframe
          src={embed.src}
          title={t('model.title', { name })}
          loading="lazy"
          allow="fullscreen; xr-spatial-tracking"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    );
  }
  return (
    <p className="hb-prose">
      {t('model.available', { format: embed.format })}{' '}
      <a className="hb-link" href={embed.src} download>{t('model.download')}</a>
    </p>
  );
}

export function VideoPlayer({ url, name }) {
  const { t } = useI18n();
  const embed = getVideoEmbed(url);
  if (!embed) return null;
  if (embed.type === 'iframe') {
    return (
      <div className="hb-embed">
        <iframe
          src={embed.src}
          title={t('video.title', { name, provider: embed.provider })}
          loading="lazy"
          allow="fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
    );
  }
  if (embed.type === 'file') {
    return (
      <div className="hb-embed hb-embed--video">
        <video controls preload="metadata" src={embed.src}>
          <a href={embed.src}>{t('video.download')}</a>
        </video>
      </div>
    );
  }
  return (
    <p className="hb-prose">
      <a className="hb-link" href={embed.src} target="_blank" rel="noopener noreferrer">{t('video.watch')}<span className="sr-only"> {t('common.newTab')}</span></a>
    </p>
  );
}

export function Documentation({ types, note }) {
  const { t } = useI18n();
  return (
    <div className="hb-prose">
      {note && <p>{note}</p>}
      {types.length > 0 && (
        <ul className="hb-chips hb-chips--row" aria-label={t('docs.types')}>
          {types.map((type) => <li className="hb-tag hb-tag--static" key={type}>{type}</li>)}
        </ul>
      )}
    </div>
  );
}

export function Sources({ items }) {
  const { t } = useI18n();
  return (
    <ol className="hb-sources">
      {items.map((source, i) => (
        <li key={i}>
          {source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}<span className="sr-only"> {t('common.newTab')}</span>
            </a>
          ) : (
            source.title
          )}
          {source.detail && <span className="hb-sources__detail">, {source.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Attribution for the card photo (required by CC BY / BY-SA licences). */
export function ImageCredit({ credit }) {
  const link = (url, text) => (url ? <a href={url} target="_blank" rel="noreferrer">{text}</a> : text);
  return (
    <p className="hb-site__credit">
      Photo: {link(credit.sourceUrl, credit.author)}
      {credit.year && `, ${credit.year}`}
      {credit.license && <>{' · '}{link(credit.licenseUrl, credit.license)}</>}
      {credit.modified && ` · ${credit.modified}`}
    </p>
  );
}
