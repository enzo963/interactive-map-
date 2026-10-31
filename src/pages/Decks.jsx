import { useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import DeckTile from '../components/decks/DeckTile';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { getGovernorateDecks, getSpecialDecks, getThematicDecks } from '../utils/decks';
import '../styles/pages.css';


// Page-scoped styles keep this refinement local to the deck catalogue.
const deckListingStyles = `
.hb-deck-listing .hb-pagehead__title { max-width: 20ch; line-height: 1.1; }
.hb-deck-listing .hb-pagehead__lede { max-width: 62ch; line-height: 1.65; }
.hb-deck-listing .hb-decks { gap: clamp(2.5rem, 5vw, 4rem); }
.hb-deck-listing .hb-decks > section { min-width: 0; }
.hb-deck-listing .hb-decks__heading { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--hb-rule-strong); }
.hb-deck-listing .hb-decks__title { margin: 0; padding: 0; border: 0; line-height: 1.15; overflow-wrap: anywhere; }
.hb-deck-listing .hb-decks__description { max-width: 62ch; margin-top: .75rem; color: var(--hb-earth-text); line-height: 1.6; }
.hb-deck-listing .hb-tiles { grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); gap: 2.5rem clamp(1.25rem, 3vw, 2rem); align-items: stretch; }
.hb-deck-listing .hb-tile { min-width: 0; display: grid; grid-template-rows: auto minmax(4rem, auto) auto 1fr; align-content: start; }
.hb-deck-listing .hb-tile__deck { margin-bottom: .75rem; }
.hb-deck-listing .hb-tile__title { font-size: clamp(1.3rem, 2vw, 1.6rem); line-height: 1.25; overflow-wrap: anywhere; }
.hb-deck-listing .hb-tile__count { margin-top: .5rem; line-height: 1.5; }
.hb-deck-listing .hb-tile__blurb { max-width: 36ch; margin-top: .625rem; line-height: 1.65; overflow-wrap: anywhere; }
.hb-deck-listing .hb-empty { padding: clamp(1.25rem, 3vw, 2rem); background: var(--hb-paper-raised); }
.hb-deck-listing .hb-empty > p { max-width: 56ch; }
@media (max-width: 30rem) {
  .hb-deck-listing .hb-tiles { grid-template-columns: minmax(0, 1fr); }
  .hb-deck-listing .hb-tile { width: 100%; max-width: 22rem; justify-self: center; grid-template-rows: auto auto auto 1fr; }
}
`;

function DeckSection({ id, title, description, decks, emptyMessage }) {
  return (
    <section aria-labelledby={id}>
      <header className="hb-decks__heading">
        <h2 id={id} className="hb-section-title hb-decks__title">{title}</h2>
        <p className="hb-decks__description">{description}</p>
      </header>
      {decks.length > 0 ? (
        <ul className="hb-tiles">{decks.map((deck) => <DeckTile deck={deck} key={deck.id} />)}</ul>
      ) : (
        <div className="hb-empty">
          <h3 className="hb-empty__title">No decks to show yet</h3>
          <p>{emptyMessage}</p>
          <SmartLink className="hb-link" href="/explore">Explore all cards</SmartLink>
        </div>
      )}
    </section>
  );
}

export default function Decks() {
  useDocumentTitle('Decks — Heritage Bridge');
  const sites = useMemo(() => getAllSites(), []);
  const governorates = useMemo(() => getGovernorateDecks(sites), [sites]);
  const special = useMemo(() => getSpecialDecks(sites), [sites]);
  const thematic = useMemo(() => getThematicDecks(sites).filter((deck) => deck.count > 0), [sites]);

  return (
    <main id="main" tabIndex={-1} className="hb-page hb-deck-listing">
      <style href="hb-deck-listing-polish" precedence="components">{deckListingStyles}</style>
      <PageHeader
        eyebrow="Decks"
        title="Collections of cards"
        lede="Every card belongs to a governorate deck, and can also sit in special and thematic decks. A card has one type but can be in many decks."
      />
      <div className="hb-container hb-decks">
        <DeckSection
          id="decks-gov"
          title="Governorate Decks"
          description="Browse the archive by place. Each deck brings together cards from one Iraqi governorate."
          decks={governorates}
          emptyMessage="Governorate decks will appear here when they are available in the archive."
        />
        <DeckSection
          id="decks-thematic"
          title="Thematic Decks"
          description="Follow a shared theme across sites, periods, and governorates."
          decks={thematic}
          emptyMessage="No thematic decks currently contain cards. You can still browse the full archive."
        />
        <DeckSection
          id="decks-special"
          title="Special Decks"
          description="Discover collections focused on heritage designations, preservation, and digital documentation."
          decks={special}
          emptyMessage="Special collections will appear here when they are available in the archive."
        />
      </div>
    </main>
  );
}
