import { useMemo } from 'react';
import Hero from '../components/home/Hero';
import FeaturedSites from '../components/home/FeaturedSites';
import DrawCard from '../components/home/DrawCard';
import { getAllSites } from '../services/siteService';
import { selectFeaturedSites, selectStackSites } from '../utils/selectSites';
import { getArchiveStats } from '../utils/archiveStats';

/**
 * Home V2 — Phase 1: Hero, Featured Cards, Draw a Card.
 * Navbar and Footer are expected to be rendered once by App.jsx.
 * Phase 2 sections (Five Card Types, Governorate Decks, Special Decks, Map preview)
 * slot in below <DrawCard />.
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
    </main>
  );
}
