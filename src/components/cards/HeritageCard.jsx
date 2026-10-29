import { useState } from 'react';
import SmartLink from '../common/SmartLink';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/heritage-card.css';

/**
 * HeritageCard v2 — the visual DNA of the platform.
 *
 * Takes ONE normalized site (see utils/siteAdapter.js). It never reads raw
 * JSON fields and never hard-codes classification: the age-based type arrives
 * as `site.cardType`, and the ornament level is driven by `data-tier` in CSS.
 * Words come from the current language (i18n `ls`), never from the record directly.
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
  const { t, ls } = useI18n();
  const Heading = headingLevel ? `h${headingLevel}` : 'p';
  const text = ls(site);
  const { cardType } = text;

  const place = [text.governorate, text.country].filter(Boolean).join(' · ');
  const hasImage = Boolean(site.image) && !imageFailed;
  const linked = interactive && Boolean(site.href);

  return (
    <article className="hb-card" data-tier={site.cardType.tier} data-type={site.cardType.id}>
      <div className="hb-card__frame">
        <header className="hb-card__top">
          <p className="hb-card__archive">
            <span className="hb-card__label">{t('card.archiveNo')}</span>
            <span className="hb-card__code" dir="ltr">{site.archiveNo}</span>
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
              alt={text.imageAlt}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="hb-card__placeholder">
              <span>{t('card.imagePending')}</span>
            </div>
          )}

          {(site.isUnesco || site.hasModel) && (
            <ul className="hb-card__badges" aria-label={t('card.indicators')}>
              {site.isUnesco && <li>{t('card.unesco')}</li>}
              {site.hasModel && <li>{t('card.model3d')}</li>}
            </ul>
          )}

          {showCta && linked && (
            <span className="hb-card__cta" aria-hidden="true">
              {t('card.view')}
            </span>
          )}
        </figure>

        <div className="hb-card__body">
          <Heading className="hb-card__title">
            {linked ? (
              <SmartLink className="hb-card__link" href={site.href}>
                {text.name}
              </SmartLink>
            ) : (
              text.name
            )}
          </Heading>
          {text.siteType && <p className="hb-card__category">{text.siteType}</p>}
          {place && <p className="hb-card__place">{place}</p>}
          {text.period && <p className="hb-card__period">{text.period}</p>}
        </div>

        <footer className="hb-card__foot">
          <span className="hb-card__date">{text.dateLabel}</span>
          <span className="hb-card__brand">{t('brand.name')}</span>
        </footer>
      </div>
    </article>
  );
}
