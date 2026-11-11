import { useMemo } from 'react';
import HeritageCard from '../cards/HeritageCard';
import { CARD_TYPES } from '../../data/cardTypes';
import { CARD_TYPE_NOTES } from '../../data/cardTypeNotes';
import { selectOnePerType } from '../../utils/selectSites';
import { makeSpecimen } from '../../utils/specimen';
import '../../styles/home-sections.css';
import { t } from '../../i18n';

/**
 * Five Card Types: one real card per type where the dataset has one,
 * otherwise a clearly-labelled specimen. Ranges and names come from CARD_TYPES.
 */
export default function CardTypes({ sites }) {
  const byTier = useMemo(() => selectOnePerType(sites), [sites]);

  return (
    <section className="hb-types" aria-labelledby="types-title">
      <div className="hb-container">
        <header className="hb-types__intro">
          <h2 id="types-title" className="hb-section-title">{t('Card classification')}</h2>
          <p className="hb-types__lede">
            {t('Every heritage card is classified by the approximate age of its site. A card has one type, and can belong to many decks.')}
          </p>
        </header>

        <ul className="hb-types__row">
          {CARD_TYPES.map((type) => (
            <li className="hb-types__item" data-tier={type.tier} key={type.id}>
              <HeritageCard site={byTier[type.tier] ?? makeSpecimen(type)} headingLevel={null} />
              <div className="hb-types__caption">
                <h3 className="hb-types__name">{t(type.shortLabel)}</h3>
                {type.rankLabel && <p className="hb-types__rank">{t(type.rankLabel)}</p>}
                <p className="hb-types__range">{t(type.rangeLabel)}</p>
                <p className="hb-types__note">{t(CARD_TYPE_NOTES[type.tier])}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
