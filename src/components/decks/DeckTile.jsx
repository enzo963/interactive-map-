import DeckPile from './DeckPile';
import SmartLink from '../common/SmartLink';
import { useI18n } from '../../i18n/I18nContext';
import { deckThickness } from '../../utils/groupDecks';
import '../../styles/pages.css';

/** A deck in a listing: pile, title link, count, blurb. */
export default function DeckTile({ deck }) {
  const { ld, cardsLabel } = useI18n();
  const text = ld(deck);
  return (
    <li className="hb-tile">
      <div className="hb-tile__deck" aria-hidden="true">
        <DeckPile variant={deck.back} label={deck.kind === 'governorate' ? text.name : text.title} thickness={deckThickness(deck.count)} />
      </div>
      <h3 className="hb-tile__title">
        <SmartLink className="hb-tile__link" href={deck.href}>{text.title}</SmartLink>
      </h3>
      <p className="hb-tile__count">{cardsLabel(deck.count)}</p>
      {text.blurb && <p className="hb-tile__blurb">{text.blurb}</p>}
    </li>
  );
}
