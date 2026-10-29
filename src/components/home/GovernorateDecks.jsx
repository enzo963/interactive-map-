import { useMemo } from 'react';
import DeckPile from '../decks/DeckPile';
import SmartLink from '../common/SmartLink';
import { useI18n } from '../../i18n/I18nContext';
import { deckThickness, groupByGovernorate } from '../../utils/groupDecks';
import '../../styles/home-sections.css';

/** One deck per governorate. Counts and thickness come from the data. */
export default function GovernorateDecks({ sites }) {
  const { t, ld, cardsLabel, localize } = useI18n();
  const decks = useMemo(() => groupByGovernorate(sites), [sites]);
  if (decks.length === 0) return null;

  return (
    <section className="hb-govs" aria-labelledby="govs-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="govs-title" className="hb-section-title">{t('govs.title')}</h2>
          <p className="hb-section-meta">
            {t('govs.meta', { decks: localize.decksLabel(decks.length), cards: cardsLabel(sites.length) })}
          </p>
        </header>

        <ul className="hb-govs__rail">
          {decks.map((deck) => {
            const text = ld({ ...deck, kind: 'governorate' });
            return (
              <li className="hb-govs__item" key={deck.id}>
                <div className="hb-govs__deck" aria-hidden="true">
                  <DeckPile variant={deck.back} label={text.name} thickness={deckThickness(deck.count)} />
                </div>
                <h3 className="hb-govs__name">
                  <SmartLink className="hb-govs__link" href={deck.href}>
                    {text.title}
                  </SmartLink>
                </h3>
                <p className="hb-govs__count">{cardsLabel(deck.count)}</p>
                <span className="hb-govs__cta" aria-hidden="true">{t('govs.cta')}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
