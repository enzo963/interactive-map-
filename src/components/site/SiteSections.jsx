import { getModelEmbed, getVideoEmbed } from '../../utils/media';
import '../../styles/site-details.css';
import '../../styles/phase4.css';

/** Wrapper used by every section. The id makes #hash links and the section list work. */
export function SiteSection({ id, title, children }) {
  return (
    <section id={id} className="hb-site__section" aria-labelledby={`${id}-title`}>
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
          <h3 className="hb-site__h3">Historical background</h3>
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

export function ModelViewer({ url, name }) {
  const embed = getModelEmbed(url);
  if (!embed) return null;
  if (embed.type === 'iframe') {
    return (
      <div className="hb-embed">
        <iframe
          src={embed.src}
          title={`3D model of ${name}`}
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
      A {embed.format} model is available for this site.{' '}
      <a className="hb-link" href={embed.src} download>Download the model</a>
    </p>
  );
}

export function VideoPlayer({ url, name }) {
  const embed = getVideoEmbed(url);
  if (!embed) return null;
  if (embed.type === 'iframe') {
    return (
      <div className="hb-embed">
        <iframe
          src={embed.src}
          title={`Video about ${name} (${embed.provider})`}
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
          <a href={embed.src}>Download the video</a>
        </video>
      </div>
    );
  }
  return (
    <p className="hb-prose">
      <a className="hb-link" href={embed.src} target="_blank" rel="noopener noreferrer">Watch the video<span className="sr-only"> (opens in a new tab)</span></a>
    </p>
  );
}

const isExternal = (url) => /^https?:\/\//i.test(url);

/** Documentation: methods, project metadata (date, team, equipment, notes) and structured digital assets. */
export function Documentation({ types, note, meta, assets }) {
  const rows = meta
    ? [
        ['Documented', meta.date],
        ['Team', meta.team],
        ['Equipment', meta.equipment.join(', ')],
        ['Notes', meta.notes],
      ].filter(([, value]) => value)
    : [];

  return (
    <div className="hb-prose">
      {note && <p>{note}</p>}
      {types.length > 0 && (
        <ul className="hb-chips hb-chips--row" aria-label="Types of documentation">
          {types.map((type) => <li className="hb-tag hb-tag--static" key={type}>{type}</li>)}
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
        <ul className="hb-assets" aria-label="Digital assets">
          {assets.map((asset, i) => (
            <li key={`${asset.url}${asset.title}${i}`}>
              <p className="hb-assets__title">
                {asset.url ? (
                  <a href={asset.url} {...(isExternal(asset.url) ? { target: '_blank', rel: 'noopener noreferrer' } : { download: true })}>
                    {asset.title || asset.type || 'Digital asset'}
                    {isExternal(asset.url) && <span className="sr-only"> (opens in a new tab)</span>}
                  </a>
                ) : (
                  asset.title
                )}
              </p>
              <p className="hb-assets__meta">
                {[asset.type, asset.format, asset.credit && `Credit: ${asset.credit}`, asset.license && `Licence: ${asset.license}`].filter(Boolean).join(' · ')}
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
      {imageCredit && <p>Main image: {imageCredit}</p>}
      {mediaLicense && <p>Media licence: {mediaLicense}</p>}
      {items.length > 0 && (
        <ul className="hb-credits">
          {items.map((image) => (
            <li key={image.src}>
              {image.alt}
              {image.credit && <>. Credit: {image.credit}</>}
              {image.license && <>. Licence: {image.license}</>}
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
              {source.title}<span className="sr-only"> (opens in a new tab)</span>
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
