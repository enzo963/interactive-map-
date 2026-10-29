import { useMemo } from 'react';
import HeritageCard from '../cards/HeritageCard';
import { CARD_TYPES } from '../../data/cardTypes';
import { useI18n } from '../../i18n/I18nContext';
import { selectOnePerType } from '../../utils/selectSites';
import { makeSpecimen } from '../../utils/specimen';
import '../../styles/home-sections.css';

/**
 * Five Card Types: one real card per type where the dataset has one,
 * otherwise a clearly-labelled specimen. Ranges and names come from CARD_TYPES.
 */
export default function CardTypes({ sites }) {
  const { t, localize } = useI18n();
  const byTier = useMemo(() => selectOnePerType(sites), [sites]);

  return (
    <section className="hb-types" aria-labelledby="types-title">
      <div className="hb-container">
        <header className="hb-types__intro">
          <h2 id="types-title" className="hb-section-title">{t('types.title')}</h2>
          <p className="hb-types__lede">{t('types.lede')}</p>
        </header>

        <ul className="hb-types__row">
          {CARD_TYPES.map((type) => {
            const label = localize.cardType(type);
            return (
              <li className="hb-types__item" data-tier={type.tier} key={type.id}>
                <HeritageCard site={byTier[type.tier] ?? makeSpecimen(type)} headingLevel={null} />
                <div className="hb-types__caption">
                  <h3 className="hb-types__name">{label.shortLabel}</h3>
                  {label.rankLabel && <p className="hb-types__rank">{label.rankLabel}</p>}
                  <p className="hb-types__range">{label.rangeLabel}</p>
                  <p className="hb-types__note">{t(`cardNote.${type.tier}`)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
