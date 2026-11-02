import SmartLink from '../common/SmartLink';
import CardStack from '../cards/CardStack';
import ArchiveStats from './ArchiveStats';
import '../../styles/home.css';
import { t } from '../../i18n';

export default function Hero({ stackSites, stats }) {
  return (
    <section className="hb-hero" aria-labelledby="hero-title">
      <div className="hb-container hb-hero__grid">
        <div className="hb-hero__copy">
          <p className="hb-eyebrow">{t('Digital Heritage Archive')}</p>
          <h1 id="hero-title" className="hb-hero__title">
            {t('Discover history, one card at a time.')}
          </h1>
          <p className="hb-hero__lede">
            {t('Explore Iraq’s archaeological, architectural, and cultural heritage through a curated collection of digital heritage cards.')}
          </p>
          <div className="hb-hero__actions">
            <SmartLink href="/explore" className="hb-btn hb-btn--ink">
              {t('Explore Cards')}
            </SmartLink>
            <a href="#draw" className="hb-link">
              {t('Draw a Card')}
            </a>
          </div>
        </div>

        <figure className="hb-hero__desk">
          <CardStack sites={stackSites} />
          <figcaption className="hb-hero__caption">{t('Selected cards from the archive')}</figcaption>
        </figure>
      </div>

      <div className="hb-container">
        <ArchiveStats stats={stats} />
      </div>
    </section>
  );
}
