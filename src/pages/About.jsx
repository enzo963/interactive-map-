import PageHeader from '../components/common/PageHeader';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Rich from '../i18n/Rich';
import { useI18n } from '../i18n/I18nContext';
import { CARD_TYPES } from '../data/cardTypes';
import { makeSpecimen } from '../utils/specimen';
import '../styles/pages.css';

const LEGEND_KEYS = ['archive', 'type', 'image', 'name', 'place', 'date'];

export default function About() {
  const { t, localize, pageTitle } = useI18n();
  useDocumentTitle(pageTitle(t('title.about')));
  const specimen = makeSpecimen(CARD_TYPES[CARD_TYPES.length - 1]);

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        lede={t('about.lede')}
      />

      <div className="hb-container hb-about">
        <section className="hb-about__block" aria-labelledby="about-cards">
          <h2 id="about-cards" className="hb-section-title">{t('about.readTitle')}</h2>
          <div className="hb-about__split">
            <div className="hb-about__card"><HeritageCard site={specimen} headingLevel={null} /></div>
            <dl className="hb-about__legend">
              {LEGEND_KEYS.map((key) => (
                <div key={key}><dt>{t(`about.legend.${key}.term`)}</dt><dd>{t(`about.legend.${key}.text`)}</dd></div>
              ))}
            </dl>
          </div>
          <p className="hb-about__note">{t('about.specimenNote')}</p>
        </section>

        <section className="hb-about__block" aria-labelledby="about-types">
          <h2 id="about-types" className="hb-section-title">{t('about.typesTitle')}</h2>
          <p className="hb-about__text"><Rich text={t('about.typesText')} /></p>
          <ul className="hb-about__types">
            {CARD_TYPES.map((type) => {
              const label = localize.cardType(type);
              return (
                <li key={type.id}>
                  <span className="hb-about__type-name">{label.shortLabel}{label.rankLabel ? ` · ${label.rankLabel}` : ''}</span>
                  <span className="hb-about__type-range">{label.rangeLabel}</span>
                  <span className="hb-about__type-note">{t(`cardNote.${type.tier}`)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="hb-about__block" aria-labelledby="about-accuracy">
          <h2 id="about-accuracy" className="hb-section-title">{t('about.accuracyTitle')}</h2>
          <p className="hb-about__text">{t('about.accuracyText')}</p>
        </section>

        <p className="hb-about__cta">
          <SmartLink className="hb-btn hb-btn--ink" href="/explore">{t('nav.explore')}</SmartLink>
          <SmartLink className="hb-link" href="/map">{t('mapPreview.open')}</SmartLink>
        </p>
      </div>
    </main>
  );
}
