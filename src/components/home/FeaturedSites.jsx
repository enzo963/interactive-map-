import SmartLink from '../common/SmartLink';
import HeritageCard from '../cards/HeritageCard';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/home.css';

/** Featured Cards — asymmetric catalogue spread, not a uniform grid. */
export default function FeaturedSites({ sites, total }) {
  const { t } = useI18n();
  if (sites.length === 0) return null;

  return (
    <section className="hb-featured" aria-labelledby="featured-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="featured-title" className="hb-section-title">{t('featured.title')}</h2>
          <p className="hb-section-meta">{t('featured.meta', { n: sites.length, total })}</p>
        </header>

        <div className="hb-featured__grid">
          {sites.map((site, index) => (
            <div className="hb-featured__item" data-position={index} key={site.id}>
              <HeritageCard site={site} headingLevel={3} showCta />
            </div>
          ))}

          <aside className="hb-featured__note">
            <p>{t('featured.note')}</p>
            <SmartLink href="/explore" className="hb-link">
              {t('featured.browse')}
            </SmartLink>
          </aside>
        </div>
      </div>
    </section>
  );
}
