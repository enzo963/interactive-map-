import { useMemo } from 'react';
import HeritageCard from '../cards/HeritageCard';
import DeckPile from '../decks/DeckPile';
import SmartLink from '../common/SmartLink';
import { DRAW_FILTERS } from '../../data/drawFilters';
import { SPECIAL_DECKS } from '../../data/specialDecks';
import { cardsLabel } from '../../utils/archiveStats';
import { deckThickness } from '../../utils/groupDecks';
import { selectFeaturedSites } from '../../utils/selectSites';
import '../../styles/home-sections.css';

/**
 * UNESCO / Lost Heritage / Our Documentation / 3D Archive.
 * Each is a deck: a card back, visible thickness, and two cards peeking out.
 * Membership reuses the Draw filters, so each definition lives in one place.
 */
export default function SpecialDecks({ sites }) {
  const decks = useMemo(
    () =>
      SPECIAL_DECKS.map((def) => {
        const filter = DRAW_FILTERS.find((f) => f.id === def.filterId);
        const cards = filter ? sites.filter(filter.test) : [];
        return { ...def, count: cards.length, href: `/decks/${def.id}`, peek: selectFeaturedSites(cards, 2) };
      }),
    [sites],
  );

  return (
    <section className="hb-sdecks" aria-labelledby="sdecks-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="sdecks-title" className="hb-section-title">Special Decks</h2>
          <p className="hb-section-meta">Collections that cut across governorates</p>
        </header>

        <ul className="hb-sdecks__grid">
          {decks.map((deck) => (
            <li className="hb-sdeck" key={deck.id}>
              <div className="hb-sdeck__stage" aria-hidden="true">
                {deck.peek.map((site, index) => (
                  <div className="hb-sdeck__peek" data-peek={index} key={site.id}>
                    <HeritageCard site={site} headingLevel={null} interactive={false} />
                  </div>
                ))}
                <DeckPile variant={deck.back} label={deck.title} thickness={deckThickness(deck.count)} />
              </div>
              <h3 className="hb-sdeck__title">
                <SmartLink className="hb-sdeck__link" href={deck.href}>
                  {deck.title}
                </SmartLink>
              </h3>
              <p className="hb-sdeck__blurb">{deck.blurb}</p>
              <p className="hb-sdeck__count">{cardsLabel(deck.count)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
