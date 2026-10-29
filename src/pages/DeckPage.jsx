import { useMemo, useState } from 'react';
import CardGrid from '../components/common/CardGrid';
import DeckPile from '../components/decks/DeckPile';
import SmartLink from '../components/common/SmartLink';
import NotFound from './NotFound';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useNavigate } from '../router/RouterContext';
import { CARD_TYPES } from '../data/cardTypes';
import { getAllSites } from '../services/siteService';
import { getDeckById } from '../utils/decks';
import { cardsLabel, formatCount } from '../utils/archiveStats';
import { deckThickness } from '../utils/groupDecks';
import { pickRandom } from '../utils/random';
import { SORTS } from '../utils/filterSites';
import '../styles/pages.css';

const DECK_KIND_LABEL = { governorate: 'Governorate Deck', special: 'Special Deck', thematic: 'Thematic Deck' };

const SORT_FNS = {
  archive: (a, b) => a.archiveNo.localeCompare(b.archiveNo, undefined, { numeric: true }),
  name: (a, b) => a.name.localeCompare(b.name),
  oldest: (a, b) => (b.ageYears ?? -1) - (a.ageYears ?? -1),
  newest: (a, b) => (a.ageYears ?? Infinity) - (b.ageYears ?? Infinity),
  type: (a, b) => b.cardType.tier - a.cardType.tier || a.name.localeCompare(b.name),
};

/** /decks/:deckId — also used for /3d-archive via the `deckId` prop. */
export default function DeckPage({ params, deckId }) {
  const id = deckId ?? params.deckId;
  const sites = useMemo(() => getAllSites(), []);
  const deck = useMemo(() => getDeckById(sites, id), [sites, id]);
  const navigate = useNavigate();
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('archive');

  useDocumentTitle(deck ? `${deck.title} — Heritage Bridge` : 'Deck not found — Heritage Bridge');

  const tiers = useMemo(
    () => (deck ? CARD_TYPES.map((type) => ({ type, count: deck.sites.filter((s) => s.cardType.tier === type.tier).length })).filter((t) => t.count > 0) : []),
    [deck],
  );
  const shown = useMemo(() => {
    if (!deck) return [];
    const base = tier === 'all' ? deck.sites : deck.sites.filter((s) => String(s.cardType.tier) === tier);
    return [...base].sort(SORT_FNS[sort]);
  }, [deck, tier, sort]);

  if (!deck) return <NotFound title="Deck not found" message="That deck is not in the archive." />;

  const drawFromDeck = () => {
    const pick = pickRandom(deck.sites);
    if (pick) navigate(pick.href);
  };

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <div className="hb-container">
        <nav className="hb-crumbs" aria-label="Breadcrumb">
          <ol>
            <li><SmartLink href="/decks">Decks</SmartLink></li>
            <li aria-current="page">{deck.title}</li>
          </ol>
        </nav>

        <header className="hb-deckhead">
          <div className="hb-deckhead__deck" aria-hidden="true">
            <DeckPile variant={deck.back} label={deck.kind === 'governorate' ? deck.name : deck.title} thickness={deckThickness(deck.count)} />
          </div>
          <div className="hb-deckhead__text">
            <p className="hb-eyebrow">{DECK_KIND_LABEL[deck.kind] ?? 'Deck'}</p>
            <h1 className="hb-pagehead__title">{deck.title}</h1>
            <p className="hb-pagehead__lede">{deck.blurb}</p>
            <p className="hb-deckhead__count">{cardsLabel(deck.count)}</p>
            {tiers.length > 0 && (
              <ul className="hb-deckhead__types" aria-label="Cards by type">
                {tiers.map(({ type, count }) => (
                  <li key={type.id}><span>{type.shortLabel}</span> <b>{formatCount(count)}</b></li>
                ))}
              </ul>
            )}
            {deck.count > 0 && (
              <button type="button" className="hb-btn hb-btn--ink" onClick={drawFromDeck}>Draw from this deck</button>
            )}
          </div>
        </header>

        {deck.count > 0 ? (
          <section aria-labelledby="deck-cards">
            <div className="hb-explore__bar hb-explore__bar--ruled">
              <h2 id="deck-cards" className="hb-section-title hb-decks__title">Cards in this deck</h2>
              <label className="hb-sort">
                <span>Sort by</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  {SORTS.map((s) => <option value={s.id} key={s.id}>{s.label}</option>)}
                </select>
              </label>
            </div>
            {tiers.length > 1 && (
              <div className="hb-chips hb-chips--row" role="group" aria-label="Filter by card type">
                <button type="button" className="hb-tag" aria-pressed={tier === 'all'} onClick={() => setTier('all')}>All types</button>
                {tiers.map(({ type }) => (
                  <button type="button" className="hb-tag" aria-pressed={tier === String(type.tier)} onClick={() => setTier(String(type.tier))} key={type.id}>
                    {type.shortLabel}
                  </button>
                ))}
              </div>
            )}
            <CardGrid key={`${tier}-${sort}`} sites={shown} />
          </section>
        ) : (
          <p className="hb-empty__title">This deck has no cards yet.</p>
        )}
      </div>
    </main>
  );
}
