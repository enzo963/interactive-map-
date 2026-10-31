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


// Applies only to this page, including its existing 3D archive reuse.
const deckPageStyles = `
.hb-deck-page .hb-crumbs li { min-width: 0; overflow-wrap: anywhere; }
.hb-deck-page .hb-deckhead { grid-template-columns: minmax(0, 14rem) minmax(0, 1fr); gap: clamp(1.5rem, 4vw, 3.5rem); padding-block: clamp(1.75rem, 4vw, 3rem); }
.hb-deck-page .hb-deckhead__text { min-width: 0; gap: .875rem; }
.hb-deck-page .hb-pagehead__title { max-width: 24ch; line-height: 1.1; overflow-wrap: anywhere; }
.hb-deck-page .hb-pagehead__lede { margin-top: 0; max-width: 60ch; line-height: 1.65; overflow-wrap: anywhere; }
.hb-deck-page .hb-deckhead__count { font-variant-numeric: tabular-nums; }
.hb-deck-page .hb-deckhead__types { gap: .5rem 1.25rem; margin-bottom: .25rem; }
.hb-deck-page .hb-deckhead__types li { display: inline-flex; align-items: baseline; gap: .5rem; }
.hb-deck-page .hb-deckhead__text > .hb-btn { margin-top: .25rem; }
.hb-deck-page .hb-deck-cards { min-width: 0; }
.hb-deck-page .hb-explore__bar--ruled { align-items: center; gap: 1rem 2rem; padding-block: 1rem; margin-bottom: 1.25rem; }
.hb-deck-page .hb-decks__title { line-height: 1.15; }
.hb-deck-page .hb-sort { flex-wrap: wrap; gap: .5rem; }
.hb-deck-page .hb-sort select { min-width: 0; max-width: 100%; min-height: 2.75rem; }
.hb-deck-page .hb-chips--row { gap: .5rem; margin-block: 0 1.25rem; }
.hb-deck-page .hb-tag { min-height: 2.75rem; white-space: normal; text-align: left; }
.hb-deck-page .hb-deck-results { margin-bottom: 1rem; font-family: var(--hb-font-mono); font-size: .8125rem; color: var(--hb-earth-text); }
.hb-deck-page .hb-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); gap: 2rem clamp(1rem, 2.5vw, 1.75rem); align-items: start; }
.hb-deck-page .hb-grid > li { min-width: 0; }
.hb-deck-page .hb-empty { padding: clamp(1.25rem, 4vw, 2.5rem); background: var(--hb-paper-raised); gap: .875rem; }
.hb-deck-page .hb-empty__title { line-height: 1.25; }
.hb-deck-page .hb-empty > p { max-width: 56ch; line-height: 1.65; }
.hb-deck-page .hb-deck-empty__actions { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1.5rem; }
@media (max-width: 40rem) {
  .hb-deck-page .hb-deckhead { grid-template-columns: minmax(0, 1fr); }
  .hb-deck-page .hb-deckhead__deck { width: 100%; max-width: 11rem; justify-self: center; }
  .hb-deck-page .hb-sort { width: 100%; justify-content: space-between; }
  .hb-deck-page .hb-sort select { flex: 1 1 10rem; }
}
@media (max-width: 30rem) {
  .hb-deck-page .hb-grid { grid-template-columns: minmax(0, 1fr); }
  .hb-deck-page .hb-grid > li { width: 100%; max-width: 22rem; justify-self: center; }
  .hb-deck-page .hb-deckhead__text > .hb-btn { width: 100%; }
}
`;

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
    <main id="main" tabIndex={-1} className="hb-page hb-deck-page">
      <style href="hb-deck-page-polish" precedence="components">{deckPageStyles}</style>
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
            {deck.blurb && <p className="hb-pagehead__lede">{deck.blurb}</p>}
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
          <section className="hb-deck-cards" aria-labelledby="deck-cards">
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
            <p className="hb-deck-results" role="status" aria-live="polite">
              {cardsLabel(shown.length)} in this selection · {formatCount(deck.count)} in the deck
            </p>
            {shown.length > 0 ? (
              <CardGrid key={`${tier}-${sort}`} sites={shown} />
            ) : (
              <div className="hb-empty">
                <h3 className="hb-empty__title">No cards match this type</h3>
                <p>Choose all types to see the cards available in this deck.</p>
                <button type="button" className="hb-btn hb-btn--ink" onClick={() => setTier('all')}>Show all types</button>
              </div>
            )}
          </section>
        ) : (
          <section className="hb-empty" aria-labelledby="deck-empty-title">
            <h2 id="deck-empty-title" className="hb-empty__title">This deck has no cards yet</h2>
            <p>There are no site records in this collection yet. Browse other decks or explore the full archive.</p>
            <div className="hb-deck-empty__actions">
              <SmartLink className="hb-btn hb-btn--ink" href="/decks">Browse decks</SmartLink>
              <SmartLink className="hb-link" href="/explore">Explore all cards</SmartLink>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
