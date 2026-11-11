import { useEffect, useRef, useState } from 'react';
import { getVideoEmbed } from '../../utils/media';
import { formatDuration } from '../../utils/siteVideos';
import '../../styles/site-details.css';
import '../../styles/phase4.css';
import { currentLocale, t } from '../../i18n';

// Scoped to this wrapper; map and card internals retain their own styles.
const sectionLayoutStyles = `
.hb-site__section--polished {
  min-width: 0;
  padding-block: clamp(1.75rem, 4vw, 3rem);
  scroll-margin-top: calc(var(--hb-header-h, 4rem) + 1rem);
}
.hb-site__section--polished > .hb-site__h2 { margin-bottom: clamp(1rem, 2.5vw, 1.75rem); line-height: 1.2; text-wrap: balance; }
.hb-site__section--polished > .hb-prose { width: 100%; }
.hb-site__section--polished .hb-prose,
.hb-site__section--polished .hb-sources,
.hb-site__section--polished .hb-timeline { overflow-wrap: anywhere; }
.hb-site__section--polished .hb-prose > * + * { margin-top: 1rem; }
.hb-site__section--polished .hb-prose > .hb-site__h3 { margin-top: 1.75rem; }
.hb-site__section--polished .hb-prose > .hb-site__h3 + p { margin-top: .5rem; }
.hb-site__section--polished .hb-timeline__item > div { min-width: 0; }
.hb-site__section--polished .hb-timeline__item:last-child { padding-bottom: 0; }
.hb-site__section--polished .hb-facts__row { grid-template-columns: minmax(0, 9rem) minmax(0, 1fr); gap: .5rem 1.25rem; }
.hb-site__section--polished .hb-facts__row > * { min-width: 0; }
.hb-site__section--polished .hb-assets li { padding-block: 1rem; }
.hb-site__section--polished .hb-assets__title { line-height: 1.35; }
.hb-site__section--polished .hb-assets__meta { line-height: 1.6; }
.hb-site__section--polished .hb-chips--row { flex-wrap: wrap; gap: .5rem; }
.hb-site__section--polished .hb-chips--row > li { min-width: 0; max-width: 100%; }
.hb-site__section--polished .hb-tag--static { white-space: normal; overflow-wrap: anywhere; }
.hb-site__section--polished .hb-embed { width: 100%; min-width: 0; }
.hb-site__section--polished .hb-sources li + li,
.hb-site__section--polished .hb-credits li + li { margin-top: .5rem; }
.hb-site__section--polished .hb-related { align-items: start; gap: clamp(1rem, 2vw, 1.75rem); }
.hb-site__section--polished .hb-related > li { min-width: 0; }
@media (max-width: 40rem) {
  .hb-site__section--polished .hb-prose { font-size: 1rem; line-height: 1.7; }
  .hb-site__section--polished .hb-facts__row { grid-template-columns: minmax(0, 1fr); gap: .25rem; padding-block: .875rem; }
}
@media (max-width: 24rem) {
  .hb-site__section--polished .hb-related { grid-template-columns: minmax(0, 1fr); }
}
`;


/** Wrapper used by every section. The id makes #hash links and the section list work. */
export function SiteSection({ id, title, children }) {
  return (
    <section id={id} className="hb-site__section hb-site__section--polished" aria-labelledby={`${id}-title`}>
      <style href="hb-site-section-layout-polish" precedence="components">{sectionLayoutStyles}</style>
      <h2 id={`${id}-title`} className="hb-site__h2">{title}</h2>
      {children}
    </section>
  );
}

const paragraphs = (value) => value.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

export function Overview({ text, background }) {
  return (
    <div className="hb-prose">
      {paragraphs(text).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
      {background && (
        <>
          <h3 className="hb-site__h3">{t('Historical background')}</h3>
          {paragraphs(background).map((paragraph, i) => <p key={`b${i}`}>{paragraph}</p>)}
        </>
      )}
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

export { default as ModelViewer } from './ModelViewer';

export function VideoPlayer({ url, name }) {
  const embed = getVideoEmbed(url);
  if (!embed) return null;
  if (embed.type === 'iframe') {
    return (
      <div className="hb-embed">
        <iframe
          src={embed.src}
          title={t('Video about {name} ({provider})', { name, provider: embed.provider })}
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
          <a href={embed.src}>{t('Download the video')}</a>
        </video>
      </div>
    );
  }
  return (
    <p className="hb-prose">
      <a className="hb-link" href={embed.src} target="_blank" rel="noopener noreferrer">{t('Watch the video')}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
    </p>
  );
}

const PUBLISHER_TYPES = {
  intergovernmental: 'Intergovernmental organization',
  'government-heritage-authority': 'Heritage authority',
  'heritage-foundation': 'Heritage foundation',
  museum: 'Museum',
  university: 'University',
  'archaeological-mission': 'Archaeological mission',
  scholarly: 'Scholarly publisher',
  'heritage-bridge': 'History in Cards',
};
const VIDEO_KINDS = {
  overview: 'Overview',
  restoration: 'Restoration',
  excavation: 'Excavation',
  'documentation-3d': '3D documentation',
  lecture: 'Lecture',
  'historic-district': 'Historic district',
};
const languageName = (code) => {
  try { return new Intl.DisplayNames([currentLocale()], { type: 'language' }).of(code) ?? code; } catch { return code; }
};

/**
 * One video: a still panel with a play button. Nothing loads from the video provider until the
 * visitor chooses to play, then the privacy-enhanced player replaces the panel.
 */
function SiteVideo({ video, name }) {
  const [playing, setPlaying] = useState(false);
  const player = useRef(null);
  // The play button disappears on activation: keep keyboard focus on the player that replaces it.
  useEffect(() => { if (playing) player.current?.focus(); }, [playing]);
  const duration = formatDuration(video.durationSeconds);
  const language = video.language && video.language !== 'en' ? languageName(video.language) : '';
  const typeLabel = PUBLISHER_TYPES[video.publisher.type];
  const kindLabel = VIDEO_KINDS[video.kind];
  const facts = [typeLabel && t(typeLabel), video.year, duration, kindLabel && t(kindLabel),
    language && t('In {language}', { language })].filter(Boolean);
  return (
    <figure className="hb-video">
      <div className="hb-embed hb-video__frame">
        {playing ? (
          <iframe
            ref={player}
            src={`${video.embedUrl}?autoplay=1&rel=0`}
            title={t('{title} — video by {publisher}', { title: video.title, publisher: video.publisher.name })}
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        ) : (
          <button type="button" className="hb-video__play" onClick={() => setPlaying(true)}
            aria-label={t('Play video: {title}, by {publisher}', { title: video.title, publisher: video.publisher.name })}>
            <svg className="hb-video__icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
              <circle cx="24" cy="24" r="22.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19 15.5v17l14-8.5z" fill="currentColor" />
            </svg>
            <span className="hb-video__publisher">{video.publisher.name}</span>
            <span className="hb-video__title">{video.title}</span>
            {duration && <span className="hb-video__duration">{duration}</span>}
            <span className="hb-video__notice">{t('Plays from YouTube; nothing loads until you press play.')}</span>
          </button>
        )}
      </div>
      <figcaption className="hb-video__caption">
        <p className="hb-video__heading">
          <a href={video.url} target="_blank" rel="noopener noreferrer">{video.title}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
        </p>
        <p className="hb-video__meta">
          {video.publisher.website
            ? <a href={video.publisher.website} target="_blank" rel="noopener noreferrer">{video.publisher.name}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
            : video.publisher.name}
          {facts.length > 0 && <> · {facts.join(' · ')}</>}
        </p>
        {video.summary && <p className="hb-video__summary">{video.summary}</p>}
        {video.note && <p className="hb-video__note">{t('About this video and {name}:', { name })} {video.note}</p>}
        {video.credit && <p className="hb-video__note">{t('Credit:')} {video.credit}</p>}
      </figcaption>
    </figure>
  );
}

/** Videos from listed institutions, shown on Site Details when a card has any. */
export function SiteVideos({ videos, name }) {
  return (
    <div className="hb-videos">
      <p className="hb-site__section-intro">{t('Videos published by heritage institutions, museums, universities and archaeological missions. History in Cards links to them; their rights remain with the publishers.')}</p>
      {videos.map((video) => <SiteVideo key={video.key} video={video} name={name} />)}
    </div>
  );
}

const isExternal = (url) => /^https?:\/\//i.test(url);

/** Documentation: methods, project metadata (date, team, equipment, notes) and structured digital assets. */
export function Documentation({ types, note, meta, assets }) {
  const rows = meta
    ? [
        [t('Documented'), meta.date],
        [t('Team'), meta.team],
        [t('Equipment'), meta.equipment.join(', ')],
        [t('Notes'), meta.notes],
      ].filter(([, value]) => value)
    : [];

  return (
    <div className="hb-prose">
      {note && <p>{note}</p>}
      {types.length > 0 && (
        <ul className="hb-chips hb-chips--row" aria-label={t('Types of documentation')}>
          {types.map((type) => <li className="hb-tag hb-tag--static" key={type}>{t(type)}</li>)}
        </ul>
      )}
      {rows.length > 0 && (
        <dl className="hb-facts hb-facts--compact">
          {rows.map(([label, value]) => (
            <div className="hb-facts__row" key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}
      {assets.length > 0 && (
        <ul className="hb-assets" aria-label={t('Digital assets')}>
          {assets.map((asset, i) => (
            <li key={`${asset.url}${asset.title}${i}`}>
              <p className="hb-assets__title">
                {asset.url ? (
                  <a href={asset.url} {...(isExternal(asset.url) ? { target: '_blank', rel: 'noopener noreferrer' } : { download: true })}>
                    {asset.title || t(asset.type) || t('Digital asset')}
                    {isExternal(asset.url) && <span className="sr-only"> ({t('opens in a new tab')})</span>}
                  </a>
                ) : (
                  asset.title
                )}
              </p>
              <p className="hb-assets__meta">
                {[asset.type, asset.format, asset.credit && `${t('Credit:')} ${asset.credit}`, asset.license && `${t('Licence:')} ${asset.license}`].filter(Boolean).join(' · ')}
              </p>
              {asset.description && <p className="hb-assets__text">{asset.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Image credits and media licensing: shown only when the record carries any. */
export function Credits({ imageCredit, mediaLicense, gallery }) {
  const items = gallery.filter((image) => image.credit || image.license);
  return (
    <div className="hb-prose">
      {imageCredit && <p>{t('Main image:')} {imageCredit}</p>}
      {mediaLicense && <p>{t('Media licence:')} {mediaLicense}</p>}
      {items.length > 0 && (
        <ul className="hb-credits">
          {items.map((image) => (
            <li key={image.src}>
              {image.alt}
              {image.credit && <>. {t('Credit:')} {image.credit}</>}
              {image.license && <>. {t('Licence:')} {image.license}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Sources({ items }) {
  return (
    <ol className="hb-sources">
      {items.map((source, i) => (
        <li key={i}>
          {source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}<span className="sr-only"> ({t('opens in a new tab')})</span>
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
