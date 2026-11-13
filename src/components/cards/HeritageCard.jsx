import { useState } from 'react';
import SmartLink from '../common/SmartLink';
import { PeriodEmblems } from '../common/CivilizationEmblem';
import { mediaLicenseState } from '../../utils/mediaAttribution';
import '../../styles/heritage-card.css';
import { t, tDate } from '../../i18n';
import { approvedCover } from '../../utils/coverApproval';

// Kept here to limit P4-01 to this component. React hoists and deduplicates
// this stylesheet by href, even when a page renders several cards.
const cardRefinementStyles = `
.hb-card.hb-card--refined {
  max-width: 100%;
  min-width: 0;
  aspect-ratio: var(--hb-card-ratio);
  isolation: isolate;
}
.hb-card--refined .hb-card__frame {
  position: absolute;
  inset: 3.5cqw;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 2.5cqw;
  padding: 3cqw;
}
.hb-card--refined .hb-card__frame > * { min-width: 0; }
.hb-card--refined .hb-card__top { align-items: flex-start; gap: 3cqw; }
.hb-card--refined .hb-card__archive,
.hb-card--refined .hb-card__type { min-width: 0; max-width: 58%; }
.hb-card--refined .hb-card__type { max-width: 42%; margin-left: auto; }
.hb-card--refined .hb-card__code,
.hb-card--refined .hb-card__type-name,
.hb-card--refined .hb-card__rank { overflow-wrap: anywhere; }
.hb-card--refined .hb-card__label,
.hb-card--refined .hb-card__rank { font-size: clamp(.5rem, 2.6cqw, .75rem); letter-spacing: .07em; }
.hb-card--refined .hb-card__code,
.hb-card--refined .hb-card__type-name { font-size: clamp(.5625rem, 3.2cqw, .9375rem); }
.hb-card--refined .hb-card__media { margin: 0; min-width: 0; border: 0; background: transparent; }
.hb-card--refined .hb-card__photo {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--card-rule);
  background: var(--hb-sand);
}
.hb-card--refined .hb-card__image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transform: none;
}
.hb-card--refined .hb-card__placeholder {
  padding: 2cqw;
  text-align: center;
  font-size: clamp(.5rem, 3cqw, .875rem);
}
.hb-card--refined .hb-card__placeholder--fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2cqw;
  background:
    radial-gradient(circle at 50% 46%, rgba(255, 255, 255, 0.55), transparent 62%),
    repeating-linear-gradient(45deg, rgba(29, 33, 30, 0.06) 0 1px, transparent 1px 2.5cqw),
    var(--hb-sand);
}
.hb-card--refined .hb-card__fallback-mark {
  width: 26cqw;
  height: auto;
  color: var(--hb-terracotta);
  opacity: 0.85;
}
.hb-card--refined .hb-card__fallback-type {
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.14em;
}
.hb-card--refined .hb-card__fallback-note {
  font-size: max(0.5rem, 2.4cqw);
  letter-spacing: 0.08em;
  opacity: 0.75;
  text-transform: none;
}
.hb-card--refined .hb-card__badges {
  top: 2cqw;
  bottom: auto;
  right: 2cqw;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.5cqw;
  pointer-events: none;
}
.hb-card--refined .hb-card__badges li {
  display: inline-flex;
  align-items: center;
  min-height: 1.7em;
  font-size: clamp(.5rem, 2.8cqw, .8125rem);
  line-height: 1.15;
  box-shadow: 0 1px 4px #0002;
}
.hb-card--refined .hb-card__cta {
  max-width: calc(100% - 4cqw);
  font-size: clamp(.5625rem, 3cqw, .875rem);
  line-height: 1.2;
}
.hb-card--refined .hb-card__body { gap: 1.2cqw; }
.hb-card--refined .hb-card__title {
  font-size: clamp(.875rem, 7cqw, 2.5rem);
  line-height: 1.12;
  overflow-wrap: anywhere;
}
.hb-card--refined .hb-card__category,
.hb-card--refined .hb-card__place,
.hb-card--refined .hb-card__period {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow-wrap: anywhere;
  line-height: 1.3;
}
.hb-card--refined .hb-card__category { font-size: clamp(.5625rem, 3.6cqw, 1rem); }
.hb-card--refined .hb-card__place,
.hb-card--refined .hb-card__period { font-size: clamp(.5rem, 2.9cqw, .8125rem); letter-spacing: .04em; }
.hb-card--refined .hb-card__foot {
  margin-top: 0;
  align-items: center;
  gap: 2cqw;
  font-size: clamp(.5rem, 3cqw, .875rem);
  line-height: 1.25;
}
.hb-card--refined .hb-card__date { min-width: 0; overflow-wrap: anywhere; }
.hb-card--refined .hb-card__brand {
  flex: 0 0 auto;
  max-width: 45%;
  text-align: right;
  font-size: clamp(.4375rem, 2.4cqw, .6875rem);
  letter-spacing: .08em;
}
/* Miniatures scale all typography with their card, preserving the photo's share. */
.hb-stack .hb-card--refined .hb-card__label,
.hb-stack .hb-card--refined .hb-card__rank { font-size: 2.6cqw; }
.hb-stack .hb-card--refined .hb-card__code,
.hb-stack .hb-card--refined .hb-card__type-name { font-size: 3.2cqw; }
.hb-stack .hb-card--refined .hb-card__title { font-size: 7cqw; }
.hb-stack .hb-card--refined .hb-card__category { font-size: 3.6cqw; }
.hb-stack .hb-card--refined .hb-card__place,
.hb-stack .hb-card--refined .hb-card__period { font-size: 2.9cqw; }
.hb-stack .hb-card--refined .hb-card__foot { font-size: 3cqw; }
.hb-stack .hb-card--refined .hb-card__brand { font-size: 2.4cqw; }
.hb-stack .hb-card__period .hb-civilization-emblem { width: 6cqw; height: 6cqw; }
/* Decorative and specimen cards should not suggest a clickable surface. */
.hb-card--refined[data-linked='false']:hover { transform: none; }
.hb-card--refined[data-linked='false']:hover .hb-card__image { transform: none; }
@media (hover: hover) and (pointer: fine) {
  .hb-card--refined[data-linked='true']:hover { transform: translateY(-4px); }
  .hb-card--refined[data-linked='true']:hover .hb-card__image { transform: none; }
}
@media (hover: none), (pointer: coarse) {
  .hb-card--refined:hover { transform: none; }
  .hb-card--refined:hover .hb-card__image { transform: none; }
  .hb-card--refined .hb-card__cta { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .hb-card--refined,
  .hb-card--refined .hb-card__image,
  .hb-card--refined .hb-card__cta { transition: none; }
  .hb-card--refined:hover .hb-card__image { transform: none; }
}
:root[data-motion='off'] .hb-card--refined:hover .hb-card__image,
:root[data-motion='reduced'] .hb-card--refined:hover .hb-card__image { transform: none; }
`;


// Intentional fallback for a card without a verified photograph of the site itself: the Heritage
// Bridge arch mark and the site type, never a stand-in photo of another place.
function CardFallback({ name, siteType }) {
  return (
    <div className="hb-card__placeholder hb-card__placeholder--fallback" role="img" aria-label={t('No verified photograph of {name}', { name })}>
      <svg className="hb-card__fallback-mark" viewBox="0 0 64 32" aria-hidden="true" focusable="false">
        <path d="M4 30h56M10 30V18a22 14 0 0 1 44 0v12M22 30V21a10 7 0 0 1 20 0v9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {siteType && <span className="hb-card__fallback-type">{t(siteType)}</span>}
      <span className="hb-card__fallback-note">{t('No verified photograph')}</span>
    </div>
  );
}

function CardImage({ cover, name, siteType, priority }) {
  const [failed, setFailed] = useState(false);
  if (!cover) return <CardFallback name={name} siteType={siteType} />;
  if (failed) {
    return (
      <div className="hb-card__placeholder" role="img" aria-label={t('Image unavailable for {name}', { name })}>
        <span>{t('Image unavailable')}</span>
      </div>
    );
  }
  return (
    <img className="hb-card__image" src={cover.src} alt={cover.alt || name}
      loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
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
  const approved = approvedCover(site);
  // Require current, bound licensing evidence as well as the image/site approval.
  const cover = approved && mediaLicenseState(approved) === 'verified' ? approved : null;
  const linked = interactive && Boolean(site.href);

  return (
    <article className="hb-card hb-card--refined" data-tier={cardType.tier} data-type={cardType.id} data-linked={linked}>
      <style href="hb-heritage-card-refinement" precedence="components">{cardRefinementStyles}</style>
      <div className="hb-card__frame">
        <header className="hb-card__top">
          <p className="hb-card__archive">
            <span className="hb-card__label">{t('Archive No.')}</span>
            <span className="hb-card__code">{site.archiveNo}</span>
          </p>
          <p className="hb-card__type">
            <span className="hb-card__type-name">{t(cardType.shortLabel)}</span>
            {cardType.rankLabel && <span className="hb-card__rank">{t(cardType.rankLabel)}</span>}
          </p>
        </header>

        <figure className="hb-card__media">
          <div className="hb-card__photo">
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
          </div>
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
          {site.siteType && <p className="hb-card__category" title={t(site.siteType)}>{t(site.siteType)}</p>}
          {place && <p className="hb-card__place" title={place}>{place}</p>}
          {(site.period || site.civilization) && <p className="hb-card__period" title={t(site.period || site.civilization)}>
            <PeriodEmblems site={site} /><span className="hb-card__period-text">{t(site.period || site.civilization)}</span>
          </p>}
        </div>

        <footer className="hb-card__foot">
          <span className="hb-card__date">{tDate(site.dateLabel)}</span>
          <span className="hb-card__brand">History in Cards</span>
        </footer>
      </div>
    </article>
  );
}
