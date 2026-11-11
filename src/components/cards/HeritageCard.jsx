import { useState } from 'react';
import SmartLink from '../common/SmartLink';
import '../../styles/heritage-card.css';
import { t, tDate } from '../../i18n';
import { approvedCover } from '../../utils/coverApproval';
import ResponsiveImage from '../common/ResponsiveImage';

// Intentional fallback for a card without a verified photograph of the site itself: the Heritage
// Bridge arch mark and the site type, never a stand-in photo of another place. A photograph that
// fails to load shows the same plate with its own note, so a broken URL never breaks the grid.
function CardFallback({ name, siteType, failed = false }) {
  const label = failed ? t('Image unavailable for {name}', { name }) : t('No verified photograph of {name}', { name });
  return (
    <div className="hb-card__placeholder" role="img" aria-label={label}>
      <svg className="hb-card__fallback-mark" viewBox="0 0 64 32" aria-hidden="true" focusable="false">
        <path d="M4 30h56M10 30V18a22 14 0 0 1 44 0v12M22 30V21a10 7 0 0 1 20 0v9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {siteType && <span className="hb-card__fallback-type">{t(siteType)}</span>}
      <span className="hb-card__fallback-note">{failed ? t('Image unavailable') : t('No verified photograph')}</span>
    </div>
  );
}

function CardImage({ cover, name, siteType, priority }) {
  const [failed, setFailed] = useState(false);
  if (!cover) return <CardFallback name={name} siteType={siteType} />;
  if (failed) return <CardFallback name={name} siteType={siteType} failed />;
  return (
    <ResponsiveImage className="hb-card__image" image={cover} alt={cover.alt || name} role="card"
      priority={priority} onError={() => setFailed(true)} />
  );
}

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
  const Heading = headingLevel ? `h${headingLevel}` : 'p';
  const { cardType } = site;

  const place = [t(site.governorate), t(site.country)].filter(Boolean).join(' · ');
  const category = site.siteType ? t(site.siteType) : '';
  const period = site.period ? t(site.period) : '';
  const date = tDate(site.dateLabel);
  const cover = approvedCover(site);
  const linked = interactive && Boolean(site.href);

  return (
    <article className="hb-card" data-tier={cardType.tier} data-type={cardType.id} data-linked={linked}>
      <div className="hb-card__frame">
        <header className="hb-card__top">
          <p className="hb-card__archive">
            <span className="hb-card__label">{t('Archive No.')}</span>
            <span className="hb-card__code" title={site.archiveNo}>{site.archiveNo}</span>
          </p>
          <p className="hb-card__type">
            <span className="hb-card__type-name" title={t(cardType.shortLabel)}>{t(cardType.shortLabel)}</span>
            {/* The rank line is kept empty when a type has none, so every header has the same height. */}
            <span className="hb-card__rank">{cardType.rankLabel ? t(cardType.rankLabel) : ''}</span>
          </p>
        </header>

        <figure className="hb-card__media">
          <CardImage key={`${site.id}:${cover?.src ?? 'pending'}`} cover={cover} name={site.name} siteType={site.siteType} priority={priority} />

          {(site.isUnesco || site.hasModel) && (
            <ul className="hb-card__badges" aria-label={t('Digital and designation indicators')}>
              {site.isUnesco && <li>UNESCO</li>}
              {site.hasModel && <li>3D</li>}
            </ul>
          )}

          {showCta && linked && (
            <span className="hb-card__cta" aria-hidden="true">
              {t('View card')} ↗
            </span>
          )}
        </figure>

        <div className="hb-card__body">
          <Heading className="hb-card__title">
            {linked ? (
              <SmartLink className="hb-card__link" href={site.href} title={site.name}>
                {site.name}
              </SmartLink>
            ) : (
              site.name
            )}
          </Heading>
          {/* Every line is always rendered so all cards share one rhythm; long values end in an ellipsis. */}
          <p className="hb-card__category" title={category || undefined}>{category}</p>
          <p className="hb-card__place" title={place || undefined}>{place}</p>
          {site.period
            ? <p className="hb-card__period" title={period}>{period}</p>
            : <p className="hb-card__period hb-card__period--missing">{t('Period not recorded')}</p>}
        </div>

        <footer className="hb-card__foot">
          <span className="hb-card__date">{date}</span>
          <span className="hb-card__brand">History in Cards</span>
        </footer>
      </div>
    </article>
  );
}
