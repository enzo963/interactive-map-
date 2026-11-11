import { useEffect, useMemo, useRef, useState } from 'react';
import useHeaderHeight from '../../hooks/useHeaderHeight';
import HeritageCard from '../cards/HeritageCard';
import MapCanvas from '../map/MapCanvas';
import SmartLink from '../common/SmartLink';
import ArchiveStats from './ArchiveStats';
import { useNavigate } from '../../router/RouterContext';
import { getGovernorateKey } from '../../data/governorates';
import { applyFilters } from '../../utils/filterSites';
import { cardsLabel } from '../../utils/archiveStats';
import { groupByGovernorate } from '../../utils/groupDecks';
import '../../styles/home.css'; // archive numbers (hb-stats) and shared hero action styles
import '../../styles/map-first.css';
import { t, tn } from '../../i18n';

const hasPosition = (site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude);

/**
 * The landing page's first screen: the archive map fills the window and a control panel on the right
 * searches the pins, moves to a governorate, shows the selected card and leads into the archive.
 * The panel is the keyboard and screen-reader route to everything the map shows.
 */
export default function HomeMap({ sites, stats }) {
  useHeaderHeight();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focusKey, setFocusKey] = useState(null);
  const [selected, setSelected] = useState(null);
  const selectedHeading = useRef(null);

  const matches = useMemo(() => (query.trim() ? applyFilters(sites, { q: query }) : sites), [sites, query]);
  const regions = useMemo(() => groupByGovernorate(sites), [sites]);
  const matchingIn = useMemo(() => {
    const counts = new Map();
    for (const site of matches) counts.set(getGovernorateKey(site.governorate), (counts.get(getGovernorateKey(site.governorate)) ?? 0) + 1);
    return counts;
  }, [matches]);
  const visible = focusKey ? matches.filter((site) => getGovernorateKey(site.governorate) === focusKey) : matches;
  const plotted = visible.filter(hasPosition).length;
  const region = regions.find((item) => item.id === focusKey);

  useEffect(() => { if (selected) selectedHeading.current?.focus(); }, [selected]);

  const select = (site) => {
    setSelected(site);
    setFocusKey(getGovernorateKey(site.governorate));
  };
  const submit = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore');
  };

  return (
    <section className="hb-mapfirst" aria-labelledby="hero-title">
      <div className="hb-mapfirst__map">
        <MapCanvas
          allSites={sites}
          visibleSites={visible}
          selectedSite={selected}
          focusKey={focusKey}
          onSelect={select}
          onSelectRegion={(key) => { setFocusKey(key); setSelected(null); }}
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

        <form className="hb-mapfirst__search" role="search" onSubmit={submit}>
          <label htmlFor="mapfirst-search" className="hb-mapfirst__label">{t('Find a site on the map')}</label>
          <div className="hb-mapfirst__searchrow">
            <input id="mapfirst-search" type="search" className="hb-input" value={query} autoComplete="off"
              placeholder={t('Name, place or period')} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} />
            <button type="submit" className="hb-btn">{t('Search')}</button>
          </div>
          <p className="hb-mapfirst__count" role="status">
            {query.trim()
              ? tn('{n} card matches', '{n} cards match', matches.length, { n: matches.length })
              : cardsLabel(sites.length)}
          </p>
        </form>

        {selected && (
          <div className="hb-mapfirst__selected">
            <h2 className="hb-mapfirst__h2" tabIndex={-1} ref={selectedHeading}>{t('Selected card')}</h2>
            <div className="hb-mapfirst__card"><HeritageCard site={selected} headingLevel={3} /></div>
            <div className="hb-mapfirst__selected-actions">
              <SmartLink href={selected.href} className="hb-btn hb-btn--ink">{t('Open site record')}</SmartLink>
              <button type="button" className="hb-link" onClick={() => setSelected(null)}>{t('Close')}</button>
            </div>
          </div>
        )}

        <div className="hb-mapfirst__regions">
          <h2 className="hb-mapfirst__h2">{t('Governorates')}</h2>
          <ul className="hb-mapfirst__regionlist">
            <li>
              <button type="button" className="hb-mapfirst__region" aria-pressed={!focusKey}
                onClick={() => { setFocusKey(null); setSelected(null); }}>
                <span>{t('All of Iraq')}</span><span className="hb-mapfirst__n">{matches.length}</span>
              </button>
            </li>
            {regions.map((item) => (
              <li key={item.id}>
                <button type="button" className="hb-mapfirst__region" aria-pressed={focusKey === item.id}
                  onClick={() => { setFocusKey(item.id); setSelected(null); }}>
                  <span>{t(item.name)}</span><span className="hb-mapfirst__n">{matchingIn.get(item.id) ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
          {region && <SmartLink href={region.href} className="hb-link">{t('Open the {name} deck', { name: t(region.name) })}</SmartLink>}
        </div>

        <ArchiveStats stats={stats} />

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
