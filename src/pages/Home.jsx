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
    <main id="main" tabIndex={-1} className="hb-home">
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
