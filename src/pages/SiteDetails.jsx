import { useMemo } from 'react';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import Gallery from '../components/site/Gallery';
import SiteLocation from '../components/site/SiteLocation';
import SectionNav from '../components/site/SectionNav';
import { Credits, Documentation, ModelViewer, Overview, Sources, SiteSection, Timeline, VideoPlayer } from '../components/site/SiteSections';
import NotFound from './NotFound';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { getDecksForSite } from '../utils/decks';
import { getRelatedSites } from '../utils/related';
import { getGovernorateKey } from '../data/governorates';
import '../styles/site-details.css';
import '../styles/phase4.css';

/**
 * /sites/:slug — ONE template for every site.
 * `sections` is built first, with a section only when the record has data for it.
 * The page renders it, and the "On this page" list is generated from the same array,
 * so neither can drift out of sync.
 */
export default function SiteDetails({ params }) {
  const sites = useMemo(() => getAllSites(), []);
  const site = useMemo(() => sites.find((s) => s.slug === params.slug) ?? null, [sites, params.slug]);
  const related = useMemo(() => (site ? getRelatedSites(site, sites, 4) : []), [site, sites]);
  const neighbours = useMemo(
    () => (site ? sites.filter((s) => s.id !== site.id && getGovernorateKey(s.governorate) === getGovernorateKey(site.governorate)) : []),
    [site, sites],
  );

  useDocumentTitle(site ? `${site.name} — Heritage Bridge` : 'Card not found — Heritage Bridge');
  if (!site) return <NotFound title="Card not found" message="That site is not in the archive." />;

  const { cardType } = site;
  const decks = getDecksForSite(site);
  const hasLocation = Number.isFinite(site.latitude) && Number.isFinite(site.longitude);
  const hasDocumentation =
    site.ourWorkTypes.length > 0 || site.ourWorkNote || site.documentationMeta || site.digitalAssets.length > 0;
  const hasCredits = site.imageCredit || site.mediaLicense || site.gallery.some((image) => image.credit || image.license);

  const facts = [
    ['Archive number', site.archiveNo],
    ['Card type', `${cardType.shortLabel}${cardType.rankLabel ? ` · ${cardType.rankLabel}` : ''} (${cardType.rangeLabel})`],
    ['Date', site.dateLabel],
    ['Period', site.period],
    ['Civilization', site.civilization],
    ['Site type', site.siteType],
    ['Governorate', site.governorate],
    ['City', site.city],
    ['Heritage status', site.heritageStatus],
    ['Preservation', site.preservationStatus],
    ['UNESCO status', site.unescoStatus || (site.isUnesco ? 'Yes' : '')],
    ['Verification', site.verificationStatus],
    ['Last verified', site.lastVerified],
  ].filter(([, value]) => value);

  const sections = [
    (site.description || site.historicalBackground) && {
      id: 'overview', title: 'Historical overview', body: <Overview text={site.description} background={site.historicalBackground} />,
    },
    site.timeline.length > 0 && { id: 'timeline', title: 'Historical timeline', body: <Timeline items={site.timeline} /> },
    site.gallery.length > 0 && { id: 'gallery', title: 'Gallery', body: <Gallery images={site.gallery} /> },
    hasLocation && { id: 'location', title: 'Location', body: <SiteLocation site={site} neighbours={neighbours} /> },
    site.modelUrl && { id: 'model', title: '3D model', body: <ModelViewer url={site.modelUrl} name={site.name} /> },
    site.videoUrl && { id: 'video', title: 'Video', body: <VideoPlayer url={site.videoUrl} name={site.name} /> },
    hasDocumentation && {
      id: 'documentation',
      title: 'Digital documentation',
      body: <Documentation types={site.ourWorkTypes} note={site.ourWorkNote} meta={site.documentationMeta} assets={site.digitalAssets} />,
    },
    site.sources.length > 0 && { id: 'sources', title: 'Sources and references', body: <Sources items={site.sources} /> },
    hasCredits && {
      id: 'credits',
      title: 'Credits and licensing',
      body: <Credits imageCredit={site.imageCredit} mediaLicense={site.mediaLicense} gallery={site.gallery} />,
    },
    related.length > 0 && {
      id: 'related',
      title: 'Related cards',
      body: (
        <ul className="hb-related">
          {related.map((other) => (
            <li key={other.id}><HeritageCard site={other} headingLevel={3} showCta /></li>
          ))}
        </ul>
      ),
    },
  ].filter(Boolean);

  const firstDeck = decks[0];

  return (
    <main id="main" tabIndex={-1} className="hb-page hb-site">
      <div className="hb-container">
        <nav className="hb-crumbs" aria-label="Breadcrumb">
          <ol>
            <li><SmartLink href="/explore">Explore Cards</SmartLink></li>
            {firstDeck && <li><SmartLink href={firstDeck.href}>{firstDeck.title}</SmartLink></li>}
            <li aria-current="page">{site.name}</li>
          </ol>
        </nav>

        <header className="hb-site__hero">
          <div className="hb-site__card">
            <HeritageCard site={site} headingLevel={null} interactive={false} priority />
          </div>
          <div className="hb-site__intro">
            <p className="hb-eyebrow">{[site.siteType, site.archiveNo].filter(Boolean).join(' · ')}</p>
            <h1 className="hb-site__title">{site.name}</h1>
            {site.shortDescription && <p className="hb-site__lede">{site.shortDescription}</p>}

            <dl className="hb-facts">
              {facts.map(([label, value]) => (
                <div className="hb-facts__row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            {decks.length > 0 && (
              <div className="hb-site__decks">
                <h2 className="hb-site__decks-title">In these decks</h2>
                <ul className="hb-chips hb-chips--row">
                  {decks.map((deck) => (
                    <li key={deck.id}><SmartLink className="hb-tag" href={deck.href}>{deck.title}</SmartLink></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </header>

        <SectionNav items={sections} />

        {sections.map((section) => (
          <SiteSection id={section.id} title={section.title} key={section.id}>{section.body}</SiteSection>
        ))}
      </div>
    </main>
  );
}
