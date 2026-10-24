import { useMemo, useState } from 'react';
import HeritageCard from '../cards/HeritageCard';
import SmartLink from '../common/SmartLink';
import { getGovernorateKey } from '../../data/governorates';
import { cardsLabel } from '../../utils/archiveStats';
import { groupByGovernorate } from '../../utils/groupDecks';
import { buildMapFrame } from '../../utils/mapFrame';
import { selectFeaturedSites } from '../../utils/selectSites';
import '../../styles/home-sections.css';

const formatLat = (v) => `${Math.abs(v)}°${v >= 0 ? 'N' : 'S'}`;
const formatLon = (v) => `${Math.abs(v)}°${v >= 0 ? 'E' : 'W'}`;

/**
 * Map preview, part of the card system: a point = a card, a governorate = a deck.
 * Points come from recorded coordinates only. No country outline is drawn
 * because none is in the dataset (real boundaries arrive with the full map, Phase 3).
 *
 * Accessibility: the governorate list is the keyboard / screen-reader control;
 * the plot is a pointer convenience and is hidden from assistive tech.
 */
export default function MapPreview({ sites }) {
  const decks = useMemo(() => groupByGovernorate(sites), [sites]);
  const frame = useMemo(() => buildMapFrame(sites), [sites]);
  const [selectedId, setSelectedId] = useState(null);

  const selected = decks.find((deck) => deck.id === selectedId) ?? decks[0];

  const markers = useMemo(() => {
    if (!frame) return [];
    return sites
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .map((site) => ({ site, deckId: getGovernorateKey(site.governorate), ...frame.project(site) }));
  }, [sites, frame]);

  const labels = useMemo(
    () =>
      decks
        .map((deck) => {
          const own = markers.filter((m) => m.deckId === deck.id);
          if (own.length === 0) return null;
          const avg = (key) => own.reduce((sum, m) => sum + m[key], 0) / own.length;
          return { id: deck.id, name: deck.name, x: avg('x'), y: avg('y') };
        })
        .filter(Boolean),
    [decks, markers],
  );

  if (!selected) return null;
  const preview = selectFeaturedSites(selected.sites, 3);

  return (
    <section className="hb-map" aria-labelledby="map-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="map-title" className="hb-section-title">Cards on the map</h2>
          <SmartLink href="/map" className="hb-link">Open the map</SmartLink>
        </header>

        <div className={`hb-map__grid ${frame ? '' : 'hb-map__grid--list'}`.trim()}>
          {frame && (
            <figure className="hb-map__figure">
              <div className="hb-map__plot" aria-hidden="true" style={{ '--ratio': frame.ratio }}>
                {frame.latTicks.map((t) => (
                  <span className="hb-map__line hb-map__line--lat" style={{ '--at': `${t.at}%` }} key={`lat${t.value}`}>
                    <span>{formatLat(t.value)}</span>
                  </span>
                ))}
                {frame.lonTicks.map((t) => (
                  <span className="hb-map__line hb-map__line--lon" style={{ '--at': `${t.at}%` }} key={`lon${t.value}`}>
                    <span>{formatLon(t.value)}</span>
                  </span>
                ))}
                {labels.map((label) => (
                  <span className="hb-map__label" style={{ '--x': `${label.x}%`, '--y': `${label.y}%` }} key={label.id}>
                    {label.name}
                  </span>
                ))}
                {markers.map((m) => (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="hb-map__dot"
                    data-selected={m.deckId === selected.id}
                    style={{ '--x': `${m.x}%`, '--y': `${m.y}%` }}
                    onClick={() => setSelectedId(m.deckId)}
                    key={m.site.id}
                  />
                ))}
              </div>
              <figcaption className="hb-map__caption">
                {markers.length} of {sites.length} cards plotted from recorded coordinates. Boundaries are not
                shown. Use the list to browse by governorate.
              </figcaption>
            </figure>
          )}

          <div className="hb-map__side">
            <div className="hb-map__list" role="group" aria-label="Governorates">
              {decks.map((deck) => (
                <button
                  type="button"
                  className="hb-map__option"
                  aria-pressed={deck.id === selected.id}
                  onClick={() => setSelectedId(deck.id)}
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
