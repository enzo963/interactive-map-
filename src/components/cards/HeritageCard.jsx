import { useState } from 'react';
import SmartLink from '../common/SmartLink';
import '../../styles/heritage-card.css';

/**
 * HeritageCard v2 — the visual DNA of the platform.
 *
 * Takes ONE normalized site (see utils/siteAdapter.js). It never reads raw
 * JSON fields and never hard-codes classification: the age-based type arrives
 * as `site.cardType`, and the ornament level is driven by `data-tier` in CSS.
 *
 * Props
 *  - site          normalized site record
 *  - headingLevel  2–6 to fit the page's heading outline, or null to render a <p>
 *  - showCta       show the "View card" hover/focus label
 *  - priority      load the image eagerly (above-the-fold cards)
 *  - interactive   false renders a plain, non-linked card (specimens, decorative peeks)
 */
export default function HeritageCard({ site, headingLevel = 3, showCta = false, priority = false, interactive = true }) {
  const [imageFailed, setImageFailed] = useState(false);
  const Heading = headingLevel ? `h${headingLevel}` : 'p';
  const { cardType } = site;

  const place = [site.governorate, site.country].filter(Boolean).join(' · ');
  const hasImage = Boolean(site.image) && !imageFailed;
  const linked = interactive && Boolean(site.href);

  return (
    <article className="hb-card" data-tier={cardType.tier} data-type={cardType.id}>
      <div className="hb-card__frame">
        <header className="hb-card__top">
          <p className="hb-card__archive">
            <span className="hb-card__label">Archive No.</span>
            <span className="hb-card__code">{site.archiveNo}</span>
          </p>
          <p className="hb-card__type">
            <span className="hb-card__type-name">{cardType.shortLabel}</span>
            {cardType.rankLabel && <span className="hb-card__rank">{cardType.rankLabel}</span>}
          </p>
        </header>

        <figure className="hb-card__media">
          {hasImage ? (
            <img
              className="hb-card__image"
              src={site.image}
              alt={site.imageAlt}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="hb-card__placeholder">
              <span>Image pending</span>
            </div>
          )}

          {(site.isUnesco || site.hasModel) && (
            <ul className="hb-card__badges" aria-label="Digital and designation indicators">
              {site.isUnesco && <li>UNESCO</li>}
              {site.hasModel && <li>3D</li>}
            </ul>
          )}

          {showCta && linked && (
            <span className="hb-card__cta" aria-hidden="true">
              View card ↗
            </span>
          )}
        </figure>

        <div className="hb-card__body">
          <Heading className="hb-card__title">
            {linked ? (
              <SmartLink className="hb-card__link" href={site.href}>
                {site.name}
              </SmartLink>
            ) : (
              site.name
            )}
          </Heading>
          {site.siteType && <p className="hb-card__category">{site.siteType}</p>}
          {place && <p className="hb-card__place">{place}</p>}
          {site.period && <p className="hb-card__period">{site.period}</p>}
        </div>

        <footer className="hb-card__foot">
          <span className="hb-card__date">{site.dateLabel}</span>
          <span className="hb-card__brand">Heritage Bridge</span>
        </footer>
      </div>
    </article>
  );
}
