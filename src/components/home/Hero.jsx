import SmartLink from '../common/SmartLink';
import CardStack from '../cards/CardStack';
import ArchiveStats from './ArchiveStats';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/home.css';

export default function Hero({ stackSites, stats }) {
  const { t } = useI18n();
  return (
    <section className="hb-hero" aria-labelledby="hero-title">
      <div className="hb-container hb-hero__grid">
        <div className="hb-hero__copy">
          <p className="hb-eyebrow">{t('hero.eyebrow')}</p>
          <h1 id="hero-title" className="hb-hero__title">
            {t('hero.title')}
          </h1>
          <p className="hb-hero__lede">{t('hero.lede')}</p>
          <div className="hb-hero__actions">
            <SmartLink href="/explore" className="hb-btn hb-btn--ink">
              {t('hero.explore')}
            </SmartLink>
            <a href="#draw" className="hb-link">
              {t('hero.draw')}
            </a>
          </div>
        </div>

        <figure className="hb-hero__desk">
          <CardStack sites={stackSites} />
          <figcaption className="hb-hero__caption">{t('hero.caption')}</figcaption>
        </figure>
      </div>

      <div className="hb-container">
        <ArchiveStats stats={stats} />
      </div>
    </section>
  );
}
