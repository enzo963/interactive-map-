import { useMemo, useState } from 'react';
import HeritageCard from '../cards/HeritageCard';
import MapCanvas from './MapCanvas';
import SmartLink from '../common/SmartLink';
import { getGovernorateKey } from '../../data/governorates';
import { cardsLabel } from '../../utils/archiveStats';
import { groupByGovernorate } from '../../utils/groupDecks';
import { selectFeaturedSites } from '../../utils/selectSites';
import '../../styles/home-sections.css';

/**
 * Map preview, part of the card system: a pin = a card, a governorate = a deck.
 * Uses the same Leaflet map as the Map page; selecting a pin opens that card's governorate deck.
 *
 * Accessibility: the governorate list is the keyboard / screen-reader control;
 * the map is a pointer convenience.
 */
export default function MapPreview({ sites }) {
  const decks = useMemo(() => groupByGovernorate(sites), [sites]);
  const [selectedId, setSelectedId] = useState(null);
  const [pinned, setPinned] = useState(null);

  const selected = decks.find((deck) => deck.id === selectedId) ?? decks[0];
  const positioned = sites.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)).length;
  const hasPositions = positioned > 0;

  if (!selected) return null;
  // A selected pin leads its deck's preview, followed by the deck's featured cards.
  const featured = selectFeaturedSites(selected.sites, 3);
  const preview = pinned && selected.sites.some((s) => s.id === pinned.id)
    ? [pinned, ...featured.filter((s) => s.id !== pinned.id)].slice(0, 3)
    : featured;

  return (
    <section className="hb-map" aria-labelledby="map-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="map-title" className="hb-section-title">Cards on the map</h2>
          <SmartLink href="/map" className="hb-link">Open the map</SmartLink>
        </header>

        <div className={`hb-map__grid ${hasPositions ? '' : 'hb-map__grid--list'}`.trim()}>
          {hasPositions && (
            <figure className="hb-map__figure">
              <MapCanvas
                allSites={sites}
                visibleSites={sites}
                selectedSite={pinned}
                onSelect={(site) => { setPinned(site); setSelectedId(getGovernorateKey(site.governorate)); }}
                size="compact"
                caption={`${positioned} of ${sites.length} cards plotted from recorded coordinates. Select a pin to open its governorate deck.`}
              />
            </figure>
          )}

          <div className="hb-map__side">
            <div className="hb-map__list" role="group" aria-label="Governorates">
              {decks.map((deck) => (
                <button
                  type="button"
                  className="hb-map__option"
                  aria-pressed={deck.id === selected.id}
                  onClick={() => { setSelectedId(deck.id); setPinned(null); }}
                  key={deck.id}
                >
                  <span>{deck.name}</span>
                  <span>{cardsLabel(deck.count)}</span>
                </button>
              ))}
            </div>

            <div className="hb-map__panel">
              <h3 className="hb-map__panel-title">{selected.name} Deck</h3>
              <p className="sr-only" role="status">
                {selected.name} deck selected. {cardsLabel(selected.count)}.
              </p>
              <ul className="hb-map__preview">
                {preview.map((site) => (
                  <li key={site.id}>
                    <HeritageCard site={site} headingLevel={null} />
                  </li>
                ))}
              </ul>
              <SmartLink href={selected.href} className="hb-link">
                Explore {selected.name} Deck
              </SmartLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
