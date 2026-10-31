import { useMemo } from 'react';
import Hero from '../components/home/Hero';
import FeaturedSites from '../components/home/FeaturedSites';
import DrawCard from '../components/home/DrawCard';
import GovernorateDecks from '../components/home/GovernorateDecks';
import CardTypes from '../components/home/CardTypes';
import SpecialDecks from '../components/home/SpecialDecks';
import OurDocumentation from '../components/home/OurDocumentation';
import AboutArchive from '../components/home/AboutArchive';
import MapPreview from '../components/map/MapPreview';
import { getAllSites } from '../services/siteService';
import { selectFeaturedSites, selectStackSites } from '../utils/selectSites';
import { getArchiveStats } from '../utils/archiveStats';

// Page-scoped layout rules stay here so P4-02 changes only the two requested files.
const homeLayoutStyles = `
.hb-home--polished { --home-section-space: clamp(3rem, 6vw, 5.5rem); }
.hb-home--polished .hb-hero { padding-top: clamp(2rem, 5vw, 4.5rem); }
.hb-home--polished .hb-hero__grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(2rem, 4vw, 4rem);
}
.hb-home--polished .hb-hero__copy { min-width: 0; max-width: 38rem; }
.hb-home--polished .hb-hero__title { max-width: 13ch; line-height: 1.06; }
.hb-home--polished .hb-hero__lede { max-width: 44ch; }
.hb-home--polished .hb-hero__desk { min-width: 0; }
.hb-home--polished .hb-hero__caption { right: 1rem; line-height: 1.4; }
.hb-home--polished .hb-hero__actions { gap: .75rem 1.5rem; }
.hb-home--polished .hb-stats { margin-top: clamp(2rem, 4vw, 3.5rem); }
.hb-home--polished .hb-stats__item {
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto;
  align-content: start;
  gap: .5rem;
  padding: clamp(1rem, 2vw, 1.5rem);
}
.hb-home--polished .hb-stats__value { grid-row: 1; font-variant-numeric: lining-nums tabular-nums; overflow-wrap: anywhere; }
.hb-home--polished .hb-stats__label { line-height: 1.4; overflow-wrap: anywhere; }
.hb-home--polished .hb-featured,
.hb-home--polished .hb-govs,
.hb-home--polished .hb-docs { padding-top: var(--home-section-space); }
.hb-home--polished .hb-draw,
.hb-home--polished .hb-types,
.hb-home--polished .hb-about-home { margin-top: var(--home-section-space); }
.hb-home--polished .hb-draw,
.hb-home--polished .hb-types,
.hb-home--polished .hb-sdecks { padding-block: var(--home-section-space); }
.hb-home--polished .hb-section-head,
.hb-home--polished .hb-types__intro { margin-bottom: clamp(1.5rem, 3vw, 2.5rem); gap: 1rem 2rem; }
.hb-home--polished .hb-section-head { flex-wrap: wrap; }
.hb-home--polished .hb-section-meta { max-width: 38ch; line-height: 1.5; }
.hb-home--polished .hb-featured__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 2.5vw, 2rem);
  margin: 0;
  padding: .5rem 0;
  overflow: visible;
}
.hb-home--polished .hb-featured__item[data-position] {
  grid-column: auto;
  grid-row: auto;
  margin-top: 0;
  min-width: 0;
}
.hb-home--polished .hb-featured__note { grid-column: 1 / -1; grid-row: auto; max-width: 64ch; align-self: start; }
.hb-home--polished .hb-draw__table {
  --card-w: 100%;
  grid-template-columns: repeat(2, minmax(0, 15rem));
  gap: clamp(1rem, 3vw, 2.5rem);
  width: 100%;
  align-items: start;
}
.hb-home--polished .hb-draw__spot { min-width: 0; }
.hb-home--polished .hb-draw__tag { line-height: 1.4; }
.hb-home--polished .hb-govs__rail { align-items: start; gap: clamp(1.25rem, 3vw, 2.5rem); }
.hb-home--polished .hb-govs__item:nth-child(even),
.hb-home--polished .hb-sdeck:nth-child(even) { margin-top: 0; }
.hb-home--polished .hb-types__item { padding-top: 0; min-width: 0; }
.hb-home--polished .hb-docs__cards { grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); align-items: start; }
.hb-home--polished .hb-docs__cards > li { min-width: 0; max-width: 22rem; }
.hb-home--polished .hb-docs__types > div { flex-wrap: wrap; gap: .25rem 1rem; }
.hb-home--polished .hb-docs__types dd { margin-left: auto; }
.hb-home--polished .hb-about-home { padding-block: clamp(2rem, 4vw, 3rem); }
.hb-home--polished .hb-about-home__points { gap: 1.5rem 2rem; }
@media (max-width: 62rem) {
  .hb-home--polished .hb-hero__grid { grid-template-columns: minmax(0, 1fr); }
  .hb-home--polished .hb-hero__title { max-width: 16ch; }
  .hb-home--polished .hb-hero__desk { width: 100%; max-width: 38rem; justify-self: center; }
  .hb-home--polished .hb-featured__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 40rem) {
  .hb-home--polished .hb-stats__item:nth-child(odd) { padding-left: 1rem; }
  .hb-home--polished .hb-sdecks__grid { grid-template-columns: minmax(0, 1fr); gap: 2.5rem; }
  .hb-home--polished .hb-sdeck { width: 100%; max-width: 22rem; justify-self: center; }
  .hb-home--polished .hb-docs__cards > li:nth-child(3) { display: list-item; }
}
@media (max-width: 30rem) {
  .hb-home--polished .hb-hero__desk { padding-inline: .5rem; }
  .hb-home--polished .hb-hero__actions { align-items: stretch; flex-direction: column; }
  .hb-home--polished .hb-hero__actions > * { justify-content: center; }
  .hb-home--polished .hb-featured__grid { grid-template-columns: minmax(0, 1fr); }
  .hb-home--polished .hb-featured__item { width: 100%; max-width: 22rem; justify-self: center; }
  .hb-home--polished .hb-draw__title { font-size: clamp(2.25rem, 10vw, 3rem); line-height: 1.05; }
}
`;


/**
 * Home. Navbar and Footer are rendered once by App.jsx.
 * Sections: Hero, Featured, Draw a Card, Map preview, Governorate Decks, Card Types,
 * Special Decks, Our Documentation (only with data), About the Archive.
 */
export default function Home() {
  const sites = useMemo(() => getAllSites(), []);
  const stats = useMemo(() => getArchiveStats(sites), [sites]);
  const stackSites = useMemo(() => selectStackSites(sites, 5), [sites]);
  const featured = useMemo(
    () => selectFeaturedSites(sites, 3, stackSites.map((s) => s.id)),
    [sites, stackSites],
  );

  return (
    <main id="main" tabIndex={-1} className="hb-home hb-home--polished">
      <style href="hb-home-layout-polish" precedence="components">{homeLayoutStyles}</style>
      <Hero stackSites={stackSites} stats={stats} />
      <FeaturedSites sites={featured} total={sites.length} />
      <DrawCard sites={sites} />
      <MapPreview sites={sites} />
      <GovernorateDecks sites={sites} />
      <CardTypes sites={sites} />
      <SpecialDecks sites={sites} />
      <OurDocumentation sites={sites} />
      <AboutArchive />
    </main>
  );
}
