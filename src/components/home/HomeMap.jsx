import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import useHeaderHeight from '../../hooks/useHeaderHeight';
import CardBack from '../cards/CardBack';
import FlipCard from '../cards/FlipCard';
import HeritageCard from '../cards/HeritageCard';
import MapCanvas from '../map/MapCanvas';
import SmartLink from '../common/SmartLink';
import StatePanel from '../common/StatePanel';
import ArchiveStats from './ArchiveStats';
import { HomeSearchContext } from './HomeSearchContext';
import { getGovernorateKey } from '../../data/governorates';
import { applyFilters } from '../../utils/filterSites';
import { cardsLabel } from '../../utils/archiveStats';
import { groupByGovernorate } from '../../utils/groupDecks';
import '../../styles/home.css'; // archive numbers (hb-stats) and shared hero action styles
import { pickRandom } from '../../utils/random';
import '../../styles/map-first.css';
import '../../styles/home-landing.css';
import { t, tn } from '../../i18n';

const hasPosition = (site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude);

/**
 * The landing page's first screen: the archive map fills the window and a control panel on the right
 * searches the pins, moves to a governorate, shows the selected card and leads into the archive.
 * The panel is the keyboard and screen-reader route to everything the map shows.
 */
export default function HomeMap({ sites, stats }) {
  useHeaderHeight();
  const query = useContext(HomeSearchContext);
  const [focusKey, setFocusKey] = useState(null);
  const [selected, setSelected] = useState(null);
  const [draws, setDraws] = useState([]);
  const [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setSelected(null);
    setDraws([]);
  }
  const selectedHeading = useRef(null);
  const previewHeading = useRef(null);

  const matches = useMemo(() => (query.trim() ? applyFilters(sites, { q: query }) : sites), [sites, query]);
  const regions = useMemo(() => groupByGovernorate(sites), [sites]);
  const matchingIn = useMemo(() => {
    const counts = new Map();
    for (const site of matches) counts.set(getGovernorateKey(site.governorate), (counts.get(getGovernorateKey(site.governorate)) ?? 0) + 1);
    return counts;
  }, [matches]);
  const visible = useMemo(
    () => focusKey ? matches.filter((site) => getGovernorateKey(site.governorate) === focusKey) : matches,
    [focusKey, matches],
  );
  const drawn = draws.at(-1);
  const plotted = visible.filter(hasPosition).length;
  const region = regions.find((item) => item.id === focusKey);

  useEffect(() => { if (selected) selectedHeading.current?.focus(); }, [selected]);

  const focusRegion = (key) => {
    setFocusKey(key);
    setSelected(null);
    setDraws([]);
  };
  const select = (site) => {
    setSelected(site);
    setFocusKey(getGovernorateKey(site.governorate));
    setDraws([]);
  };
  const draw = () => {
    const site = pickRandom(visible, drawn?.id);
    if (site) setDraws([...draws, site]);
  };
  const reveal = () => {
    previewHeading.current?.focus();
    draw();
  };
  const previous = () => {
    if (draws.length === 1) previewHeading.current?.focus();
    setDraws(draws.slice(0, -1));
  };
  return (
    <section className="hb-mapfirst hb-mapfirst--home" aria-labelledby="hero-title">
      <div className="hb-mapfirst__map">
        <MapCanvas
          allSites={sites}
          visibleSites={visible}
          selectedSite={selected}
          focusKey={focusKey}
          onSelect={select}
          onSelectRegion={focusRegion}
          size="fill"
          caption={t('{n} of {total} cards shown as pins from recorded coordinates. Select a pin to see its card.', { n: plotted, total: visible.length })}
        />
      </div>

      <aside className="hb-mapfirst__panel" aria-label={t('Map controls')}>
        <header className="hb-mapfirst__intro">
          <p className="hb-eyebrow">{t('Digital Heritage Archive')}</p>
          <h1 id="hero-title" className="hb-mapfirst__title">{t('Discover history, one card at a time.')}</h1>
          <p className="hb-mapfirst__lede">{t('Every pin is a heritage card from Iraq’s archaeological, architectural and cultural record.')}</p>
        </header>

        <div className="hb-mapfirst__regions">
          <div className="hb-mapfirst__regionbar">
            <h2 className="hb-mapfirst__h2">{t('Governorates')}</h2>
            <button type="button" className="hb-mapfirst__region hb-mapfirst__region--all" aria-pressed={!focusKey}
              onClick={() => focusRegion(null)}>
              <span>{t('All of Iraq')}</span>
            </button>
          </div>
          <p className="hb-mapfirst__count" role="status">
            {query.trim() ? tn('{n} card matches', '{n} cards match', matches.length) : cardsLabel(sites.length)}
          </p>
          <ul className="hb-mapfirst__regionlist">
            {regions.map((item) => (
              <li key={item.id}>
                <button type="button" className="hb-mapfirst__region" aria-pressed={focusKey === item.id}
                  onClick={() => focusRegion(item.id)}>
                  <span>{t(item.name)}</span><span className="hb-mapfirst__n">{matchingIn.get(item.id) ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
          {region && <SmartLink href={region.href} className="hb-link">{t('Open the {name} deck', { name: t(region.name) })}</SmartLink>}
        </div>

        <ArchiveStats stats={stats} />

        <section className="hb-mapfirst__preview" aria-labelledby="home-preview-title">
          <h2 id="home-preview-title" className="hb-mapfirst__preview-title" ref={previewHeading} tabIndex={-1}>
            {t('Flip through history')}
          </h2>
          <p className="sr-only" role="status">{drawn?.name}</p>
          {selected || visible.length > 0 ? (
            <div className="hb-mapfirst__preview-grid">
              <div className="hb-mapfirst__stack" data-stacked={visible.length > 1}>
                {selected ? <HeritageCard site={selected} headingLevel={3} /> : (
                  <FlipCard
                    flipped={Boolean(drawn)}
                    front={drawn && <HeritageCard site={drawn} headingLevel={3} />}
                    back={(
                      <>
                        <CardBack variant={region?.back} label={t(region?.name ?? 'All of Iraq')} />
                        {!drawn && <button type="button" className="hb-mapfirst__reveal"
                          aria-label={t('Draw a card')} onClick={reveal} />}
                      </>
                    )}
                  />
                )}
              </div>
              <div className="hb-mapfirst__preview-controls">
                {selected ? (
                  <>
                    <h3 className="hb-mapfirst__h2" tabIndex={-1} ref={selectedHeading}>{t('Selected card')}</h3>
                    <SmartLink href={selected.href} className="hb-link">{t('Open site record')}</SmartLink>
                    <button type="button" className="hb-btn" onClick={() => {
                      setSelected(null);
                      previewHeading.current?.focus();
                    }}>{t('Close')}</button>
                  </>
                ) : drawn ? (
                  <>
                    <button type="button" className="hb-btn hb-btn--ink" disabled={visible.length < 2}
                      onClick={draw}>{t('Draw another card')}</button>
                    <button type="button" className="hb-btn" onClick={previous}>{t('Previous')}</button>
                  </>
                ) : (
                  <p className="hb-mapfirst__preview-hint">{t('Select the card to reveal a random site.')}</p>
                )}
              </div>
            </div>
          ) : sites.length > 0 && (
            <StatePanel kind="no-results" title={t('No cards match these filters')} headingLevel={3} compact />
          )}
        </section>

        <div className="hb-mapfirst__actions hb-hero__actions">
          <SmartLink href="/explore" className="hb-btn hb-btn--ink">{t('Explore Cards')}</SmartLink>
          <a href="#draw" className="hb-btn">{t('Draw a Card')}</a>
          <SmartLink href="/map" className="hb-link">{t('Full map with filters')}</SmartLink>
        </div>
        <a href="#archive" className="hb-mapfirst__more">{t('More from the archive')} <span aria-hidden="true">↓</span></a>
      </aside>
    </section>
  );
}
