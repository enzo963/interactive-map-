import { useMemo } from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import StatePanel from '../components/common/StatePanel';
import HomeMap from '../components/home/HomeMap';
import FeaturedSites from '../components/home/FeaturedSites';
import DrawCard from '../components/home/DrawCard';
import GovernorateDecks from '../components/home/GovernorateDecks';
import CardTypes from '../components/home/CardTypes';
import SpecialDecks from '../components/home/SpecialDecks';
import OurDocumentation from '../components/home/OurDocumentation';
import AboutArchive from '../components/home/AboutArchive';
import { getAllSites } from '../services/siteService';
import { selectFeaturedSites } from '../utils/selectSites';
import { getArchiveStats } from '../utils/archiveStats';
import '../styles/home-polish.css';
import { t } from '../i18n';

/**
 * Home. Navbar and Footer are rendered once by App.jsx.
 * Map first: the archive map fills the window with a control panel on the right (HomeMap). Below it:
 * Featured, Draw a Card, Governorate Decks, Card Types, Special Decks, Our Documentation (only with data),
 * About the Archive.
 */
export default function Home() {
  useDocumentTitle('History in Cards');
  const sites = useMemo(() => getAllSites(), []);
  const stats = useMemo(() => getArchiveStats(sites), [sites]);
  const featured = useMemo(() => selectFeaturedSites(sites, 3), [sites]);

  return (
    <main id="main" tabIndex={-1} className="hb-home hb-home--polished hb-home--map">
      <HomeMap sites={sites} stats={stats} />
      <div id="archive" className="hb-home__archive">
        {sites.length === 0 && <div className="hb-container"><StatePanel title={t('No heritage cards yet')}
          description={t('The archive is currently empty. Site records will appear after research and review; the map and collections remain available to explore.')} /></div>}
        <FeaturedSites sites={featured} total={sites.length} />
        <DrawCard sites={sites} />
        <GovernorateDecks sites={sites} />
        <CardTypes sites={sites} />
        <SpecialDecks sites={sites} />
        <OurDocumentation sites={sites} />
        <AboutArchive />
      </div>
    </main>
  );
}
