import { useMemo, useState } from 'react';
import HeritageCard from '../cards/HeritageCard';
import MapCanvas from './MapCanvas';
import SmartLink from '../common/SmartLink';
import { getGovernorateKey } from '../../data/governorates';
import { useI18n } from '../../i18n/I18nContext';
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
  const { t, ld, cardsLabel, localize } = useI18n();
  const decks = useMemo(() => groupByGovernorate(sites), [sites]);
  const [selectedId, setSelectedId] = useState(null);
  const [pinned, setPinned] = useState(null);

  const selected = decks.find((deck) => deck.id === selectedId) ?? decks[0];
  const positioned = sites.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)).length;
  const hasPositions = positioned > 0;

  if (!selected) return null;
  const selectedText = ld({ ...selected, kind: 'governorate' });
  // A selected pin leads its deck's preview, followed by the deck's featured cards.
  const featured = selectFeaturedSites(selected.sites, 3);
  const preview = pinned && selected.sites.some((s) => s.id === pinned.id)
    ? [pinned, ...featured.filter((s) => s.id !== pinned.id)].slice(0, 3)
    : featured;

  return (
    <section className="hb-map" aria-labelledby="map-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="map-title" className="hb-section-title">{t('mapPreview.title')}</h2>
          <SmartLink href="/map" className="hb-link">{t('mapPreview.open')}</SmartLink>
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
                caption={t('mapPreview.caption', { plotted: positioned, total: sites.length })}
              />
            </figure>
          )}

          <div className="hb-map__side">
            <div className="hb-map__list" role="group" aria-label={t('mapPreview.govs')}>
              {decks.map((deck) => (
                <button
                  type="button"
                  className="hb-map__option"
                  aria-pressed={deck.id === selected.id}
                  onClick={() => { setSelectedId(deck.id); setPinned(null); }}
                  key={deck.id}
                >
                  <span>{localize.governorate(deck.name)}</span>
                  <span>{cardsLabel(deck.count)}</span>
                </button>
              ))}
            </div>

            <div className="hb-map__panel">
              <h3 className="hb-map__panel-title">{selectedText.title}</h3>
              <p className="sr-only" role="status">
                {t('mapPreview.selected', { name: selectedText.name, cards: cardsLabel(selected.count) })}
              </p>
              <ul className="hb-map__preview">
                {preview.map((site) => (
                  <li key={site.id}>
                    <HeritageCard site={site} headingLevel={null} />
                  </li>
                ))}
              </ul>
              <SmartLink href={selected.href} className="hb-link">
                {t('mapPreview.explore', { title: selectedText.title })}
              </SmartLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
