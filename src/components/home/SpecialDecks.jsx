import { useMemo } from 'react';
import HeritageCard from '../cards/HeritageCard';
import DeckPile from '../decks/DeckPile';
import SmartLink from '../common/SmartLink';
import { getSpecialDecks } from '../../utils/decks';
import { useI18n } from '../../i18n/I18nContext';
import { deckThickness } from '../../utils/groupDecks';
import { selectFeaturedSites } from '../../utils/selectSites';
import '../../styles/home-sections.css';

/**
 * UNESCO / Lost Heritage / Our Documentation / 3D Archive.
 * Each is a deck: a card back, visible thickness, and two cards peeking out.
 */
export default function SpecialDecks({ sites }) {
  const { t, ld, cardsLabel } = useI18n();
  const decks = useMemo(
    () => getSpecialDecks(sites).map((deck) => ({ ...deck, peek: selectFeaturedSites(deck.sites, 2) })),
    [sites],
  );

  return (
    <section className="hb-sdecks" aria-labelledby="sdecks-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="sdecks-title" className="hb-section-title">{t('sdecks.title')}</h2>
          <p className="hb-section-meta">{t('sdecks.meta')}</p>
        </header>

        <ul className="hb-sdecks__grid">
          {decks.map((deck) => {
            const text = ld(deck);
            return (
            <li className="hb-sdeck" key={deck.id}>
              <div className="hb-sdeck__stage" aria-hidden="true">
                {deck.peek.map((site, index) => (
                  <div className="hb-sdeck__peek" data-peek={index} key={site.id}>
                    <HeritageCard site={site} headingLevel={null} interactive={false} />
                  </div>
                ))}
                <DeckPile variant={deck.back} label={text.title} thickness={deckThickness(deck.count)} />
              </div>
              <h3 className="hb-sdeck__title">
                <SmartLink className="hb-sdeck__link" href={deck.href}>{text.title}</SmartLink>
              </h3>
              <p className="hb-sdeck__blurb">{text.blurb}</p>
              <p className="hb-sdeck__count">{cardsLabel(deck.count)}</p>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
