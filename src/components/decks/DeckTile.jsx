import DeckPile from './DeckPile';
import SmartLink from '../common/SmartLink';
import { cardsLabel } from '../../utils/archiveStats';
import { deckThickness } from '../../utils/groupDecks';
import '../../styles/pages.css';
import { t } from '../../i18n';

/** A deck in a listing: pile, title link, count, blurb. */
export default function DeckTile({ deck }) {
  return (
    <li className="hb-tile">
      <div className="hb-tile__deck" aria-hidden="true">
        <DeckPile variant={deck.back} label={deck.kind === 'governorate' ? t(deck.name) : t(deck.title)} thickness={deckThickness(deck.count)} />
      </div>
      <h3 className="hb-tile__title">
        <SmartLink className="hb-tile__link" href={deck.href}>{t(deck.title)}</SmartLink>
      </h3>
      <p className="hb-tile__count">{cardsLabel(deck.count)}</p>
      {deck.blurb && <p className="hb-tile__blurb">{t(deck.blurb)}</p>}
    </li>
  );
}
