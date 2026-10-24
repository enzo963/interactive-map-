import { useMemo } from 'react';
import DeckPile from '../decks/DeckPile';
import SmartLink from '../common/SmartLink';
import { cardsLabel, formatCount } from '../../utils/archiveStats';
import { deckThickness, groupByGovernorate } from '../../utils/groupDecks';
import '../../styles/home-sections.css';

/** One deck per governorate. Counts and thickness come from the data. */
export default function GovernorateDecks({ sites }) {
  const decks = useMemo(() => groupByGovernorate(sites), [sites]);
  if (decks.length === 0) return null;

  return (
    <section className="hb-govs" aria-labelledby="govs-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="govs-title" className="hb-section-title">Governorate Decks</h2>
          <p className="hb-section-meta">
            {formatCount(decks.length)} decks, {cardsLabel(sites.length)}
          </p>
        </header>

        <ul className="hb-govs__rail">
          {decks.map((deck) => (
            <li className="hb-govs__item" key={deck.id}>
              <div className="hb-govs__deck" aria-hidden="true">
                <DeckPile variant={deck.back} label={deck.name} thickness={deckThickness(deck.count)} />
              </div>
              <h3 className="hb-govs__name">
                <SmartLink className="hb-govs__link" href={deck.href}>
                  {deck.name} Deck
                </SmartLink>
              </h3>
              <p className="hb-govs__count">{cardsLabel(deck.count)}</p>
              <span className="hb-govs__cta" aria-hidden="true">Explore Deck</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
