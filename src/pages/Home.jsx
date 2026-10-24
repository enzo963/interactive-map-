import { useMemo } from 'react';
import Hero from '../components/home/Hero';
import FeaturedSites from '../components/home/FeaturedSites';
import DrawCard from '../components/home/DrawCard';
import GovernorateDecks from '../components/home/GovernorateDecks';
import CardTypes from '../components/home/CardTypes';
import SpecialDecks from '../components/home/SpecialDecks';
import MapPreview from '../components/map/MapPreview';
import { getAllSites } from '../services/siteService';
import { selectFeaturedSites, selectStackSites } from '../utils/selectSites';
import { getArchiveStats } from '../utils/archiveStats';

/**
 * Home V2 — Phase 1 + 2.
 * Navbar and Footer are rendered once by App.jsx.
 * Still to come: Our Work, About the Archive (Phase 3 content pass).
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
    <main id="main" className="hb-home">
      <Hero stackSites={stackSites} stats={stats} />
      <FeaturedSites sites={featured} total={sites.length} />
      <DrawCard sites={sites} />
      <MapPreview sites={sites} />
      <GovernorateDecks sites={sites} />
      <CardTypes sites={sites} />
      <SpecialDecks sites={sites} />
    </main>
  );
}
