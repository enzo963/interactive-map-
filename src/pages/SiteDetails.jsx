import { useMemo } from 'react';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import HeritageMediaGallery from '../components/site/HeritageMediaGallery';
import BeforeAfterComparison from '../components/site/BeforeAfterComparison';
import PhotogrammetryProjects from '../components/site/PhotogrammetryProjects';
import SiteLocation from '../components/site/SiteLocation';
import SectionNav from '../components/site/SectionNav';
import { Documentation, ModelViewer, Overview, Sources, SiteSection, VideoPlayer } from '../components/site/SiteSections';
import { PreservationAssessment, HistoricalNarrative, SiteHistoricalTimeline } from '../components/site/HeritageStory';
import { preservationLabel } from '../utils/heritageExperience';
import NotFound from './NotFound';
import StatePanel from '../components/common/StatePanel';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { getDecksForSite } from '../utils/decks';
import ShareSite from '../components/site/ShareSite';
import { getRelatedSiteMatches } from '../utils/related';
import { getGovernorateKey } from '../data/governorates';
import MediaAttribution from '../components/site/MediaAttribution';
import { mediaLicenseState } from '../utils/mediaAttribution';
import { safeUrl } from '../utils/urls';
import { useLocation } from '../router/RouterContext';
import '../styles/site-details.css';
import '../styles/phase4.css';
import { t, tDate } from '../i18n';

const siteDetailsStyles = `
.hb-site--structured .hb-crumbs li { min-width: 0; overflow-wrap: anywhere; }
.hb-site--structured .hb-site__hero {
  grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
  grid-template-areas: 'card intro' 'card details';
  gap: 1.5rem clamp(1.5rem, 4vw, 3.5rem); align-items: start;
  padding-block: clamp(1.5rem, 3vw, 2.5rem) clamp(2rem, 4vw, 3.5rem);
}
.hb-site--structured .hb-site__intro { grid-area: intro; min-width: 0; }
.hb-site--structured .hb-site__card { grid-area: card; width: 100%; }
.hb-site--structured .hb-site__metadata { grid-area: details; min-width: 0; }
.hb-site--structured .hb-site__title { max-width: 24ch; line-height: 1.08; overflow-wrap: anywhere; }
.hb-site--structured .hb-site__lede { max-width: 60ch; line-height: 1.7; overflow-wrap: anywhere; }
.hb-site--structured .hb-site__badges { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }
.hb-site--structured .hb-site__badge { display: inline-flex; align-items: center; min-height: 2.75rem; padding: .4rem .75rem; border: 1px solid var(--hb-rule-strong); background: var(--hb-paper-raised); font-family: var(--hb-font-mono); font-size: .75rem; line-height: 1.4; text-underline-offset: .2em; }
.hb-site--structured .hb-site__metadata-title { font-family: var(--hb-font-serif); font-size: 1.5rem; font-weight: 500; }
.hb-site--structured .hb-site__fact-group + .hb-site__fact-group { margin-top: 1.5rem; }
.hb-site--structured .hb-site__fact-group h3 { margin-top: 1rem; font-family: var(--hb-font-mono); font-size: .75rem; font-weight: 500; text-transform: uppercase; letter-spacing: .08em; color: var(--hb-earth-text); }
.hb-site--structured .hb-facts { margin-top: .625rem; }
.hb-site--structured .hb-facts__row { grid-template-columns: minmax(0, 9rem) minmax(0, 1fr); gap: .5rem 1.25rem; padding-block: .75rem; }
.hb-site--structured .hb-facts__row > * { min-width: 0; overflow-wrap: anywhere; }
.hb-site--structured .hb-site__decks .hb-tag { min-height: 2.75rem; white-space: normal; overflow-wrap: anywhere; }
.hb-site--structured .hb-sectionnav ol { gap: .375rem 1.25rem; }
.hb-site--structured .hb-sectionnav a { min-height: 2.75rem; display: inline-flex; align-items: center; }
.hb-site--structured .hb-site__section-intro { max-width: 64ch; margin-bottom: 1rem; line-height: 1.65; color: var(--hb-earth-text); }
.hb-site--structured .hb-gallery { grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr)); gap: 1rem; }
.hb-site--structured .hb-gallery li { display: flex; flex-direction: column; gap: .5rem; }
.hb-site--structured .hb-gallery__item { height: auto; flex: 1; min-height: 9rem; }
.hb-site--structured .hb-gallery__item:disabled { cursor: default; }
.hb-site--structured .hb-gallery__unavailable { display: grid; place-items: center; min-height: 12rem; padding: 1rem; }
.hb-site--structured .hb-gallery__attribution { font-size: .8125rem; line-height: 1.5; overflow-wrap: anywhere; }
.hb-site--structured .hb-image-attribution p { margin-block: .25rem; }
.hb-site--structured .hb-lightbox__figure figcaption { flex-wrap: wrap; overflow-wrap: anywhere; }
.hb-site--structured .hb-lightbox__controls { flex-wrap: wrap; }
.hb-site--structured .hb-lightbox__controls button { min-height: 2.75rem; }
.hb-site--structured .hb-sources { list-style: decimal; padding-left: 1.5rem; }
.hb-site--structured .hb-sources li { padding-block: .75rem; border-bottom: 1px solid var(--hb-rule); overflow-wrap: anywhere; }
.hb-site--structured .hb-related { grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); align-items: start; }
.hb-site--structured .hb-related > li { min-width: 0; }
@media (max-width: 62rem) {
  .hb-site--structured .hb-site__hero { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'intro' 'card' 'details'; }
  .hb-site--structured .hb-site__card { position: static; max-width: 18rem; justify-self: center; }
}
@media (max-width: 40rem) {
  .hb-site--structured .hb-facts__row { grid-template-columns: minmax(0, 1fr); gap: .25rem; }
  .hb-site--structured .hb-site__lede { font-size: 1.05rem; }
}
@media (max-width: 30rem) {
  .hb-site--structured .hb-related { grid-template-columns: minmax(0, 1fr); }
  .hb-site--structured .hb-related > li { width: 100%; max-width: 22rem; justify-self: center; }
}
`;


function ImageAttribution({ image }) {
  return <MediaAttribution media={image} image />;
}

/**
 * /sites/:slug — ONE template for every site.
 * `sections` is built first; optional media sections require data, while sources
 * always shows either references or an explicit missing-reference message.
 * The page renders it, and the "On this page" list is generated from the same array,
 * so neither can drift out of sync.
 */
export default function SiteDetails({ params }) {
  const { resultsHref } = useLocation();
  const sites = useMemo(() => getAllSites(), []);
  const site = useMemo(() => sites.find((s) => s.slug === params.slug) ?? null, [sites, params.slug]);
  const related = useMemo(() => (site ? getRelatedSiteMatches(site, sites, 4) : []), [site, sites]);
  const neighbours = useMemo(
    () => (site ? sites.filter((s) => s.id !== site.id && getGovernorateKey(s.governorate) === getGovernorateKey(site.governorate)) : []),
    [site, sites],
  );

  useDocumentTitle(site ? `${site.name} — History in Cards` : t('Card not found — History in Cards'));
  if (!site) return <NotFound title={t('Card not found')} message={t('That site is not in the archive.')} />;

  const { cardType } = site;
  const decks = getDecksForSite(site);
  const hasLocation = Number.isFinite(site.latitude) && Number.isFinite(site.longitude);
  const hasDocumentation =
    site.ourWorkTypes.length > 0 || site.ourWorkNote || site.documentationMeta || site.digitalAssets.length > 0;
  const authoredMedia = [site.coverImage, ...site.galleryImages];
  const restrictedUrls = new Set(authoredMedia.filter((image) => image && mediaLicenseState(image) === 'restricted').map((image) => image.src));
  const media = authoredMedia.filter((image, index, all) => image
    && safeUrl(image.src, { allowRelative: true }) && !restrictedUrls.has(image.src)
    && (!image.siteId || image.siteId === site.id) && all.findIndex((other) => other?.src === image.src) === index);
  const hasCredits = media.length > 0 || site.imageCredit;

  const factGroups = [
    {
      title: t('Archive record'),
      rows: [
        [t('Archive number'), site.archiveNo],
        [t('Card type'), `${t(cardType.shortLabel)}${cardType.rankLabel ? ` · ${t(cardType.rankLabel)}` : ''} (${t(cardType.rangeLabel)})`],
        [t('Date'), tDate(site.dateLabel)],
        [t('Period'), t(site.period)],
        [t('Civilization'), site.civilization],
        [t('Site type'), t(site.siteType)],
      ],
    },
    {
      title: t('Place'),
      rows: [[t('Governorate'), t(site.governorate) || t('Governorate not recorded')], [t('City'), site.city], [t('Country'), t(site.country)]],
    },
    {
      title: t('Status and verification'),
      rows: [
        [t('Heritage status'), t(site.heritageStatus)],
        [t('Preservation'), `${t(preservationLabel(site.preservation?.verified ? site.preservation.state : site.preservation?.reportedState))} · ${site.preservation?.verified ? t('Source-backed assessment') : t('Unverified')}`],
        [t('UNESCO status'), t(site.unescoStatus) || (site.isUnesco ? t('Yes') : '')],
        [t('Verification'), t(site.verificationStatus)],
        [t('Last verified'), site.lastVerified],
      ],
    },
  ].map((group) => ({ ...group, rows: group.rows.filter(([, value]) => value) })).filter((group) => group.rows.length > 0);

  const sections = [
    {
      id: 'overview', title: t('Historical overview'), body: site.description || site.historicalBackground ? <Overview text={site.description} background={site.historicalBackground} /> : <StatePanel kind="unavailable" title={t('Historical overview unavailable')} description={t('A source-backed description has not been recorded yet.')} headingLevel={3} compact />,
    },
    { id: 'preservation', title: t('Preservation and condition'), body: <PreservationAssessment assessment={site.preservation} /> },
    ...(site.storySections || []).map((section) => ({ id: `story-${section.type}`, title: t(section.title), body: <HistoricalNarrative section={section} /> })),
    site.historicalEvents?.length > 0 && { id: 'timeline', title: t('Historical timeline'), body: <SiteHistoricalTimeline events={site.historicalEvents} /> },
    { id: 'gallery', title: t('Gallery'), body: <HeritageMediaGallery key={site.id} site={site} images={media} /> },
    site.comparisons?.length > 0 && { id: 'comparisons', title: t('Before and after'), body: site.comparisons.map((comparison) => <BeforeAfterComparison key={comparison.id} comparison={comparison} />) },
    { id: 'location', title: t('Location'), body: hasLocation ? <SiteLocation site={site} neighbours={neighbours} /> : <StatePanel kind="unavailable" title={t('Location unavailable')} description={t('Verified coordinates have not been recorded. This site remains available in the archive without an invented map position.')} headingLevel={3} compact /> },
    { id: 'model', title: t('3D model'), body: site.modelResources.length ? site.modelResources.map((resource) => <ModelViewer key={resource.url} resource={resource} siteId={site.id} name={site.name} />) : <ModelViewer name={site.name} /> },
    site.photogrammetryProjects?.length > 0 && { id: 'projects', title: t('Photogrammetry projects'), body: <PhotogrammetryProjects projects={site.photogrammetryProjects} /> },
    site.videoUrl && { id: 'video', title: t('Video'), body: <VideoPlayer url={site.videoUrl} resource={site.videoResource} name={site.name} /> },
    hasDocumentation && {
      id: 'documentation',
      title: t('Digital documentation'),
      body: <Documentation types={site.ourWorkTypes} note={site.ourWorkNote} meta={site.documentationMeta} assets={site.digitalAssets} />,
    },
    { id: 'sources', title: t('Sources and references'), body: site.sources.length > 0 ? <Sources items={site.sources} /> : <StatePanel kind="unavailable" title={t('References unavailable')} description={t('No source references have been added to this record yet.')} headingLevel={3} compact /> },
    hasCredits && {
      id: 'credits',
      title: t('Image sources and licensing'),
      body: <div className="hb-prose">{site.imageCredit && <p>{t('Image credit:')} {site.imageCredit}</p>}
        <ul className="hb-credits">{media.map((image) => <li key={image.src}><p>{image.alt}</p><ImageAttribution image={image} /></li>)}</ul>
      </div>,
    },
    related.length > 0 && {
      id: 'related',
      title: t('Related cards'),
      body: (
        <>
          <p className="hb-site__section-intro">{t('Continue exploring with related records from the archive.')}</p>
          <ul className="hb-related">
            {related.map(({ site: other, reasons }) => (
              <li key={other.id}><HeritageCard site={other} headingLevel={3} showCta /><p className="hb-related__reason">{reasons.map((reason) => t(reason)).join(' · ')}</p></li>
            ))}
          </ul>
        </>
      ),
    },
  ].filter(Boolean);

  const firstDeck = decks[0];

  return (
    <main id="main" tabIndex={-1} className="hb-page hb-site hb-site--structured">
      <style href="hb-site-details-structure" precedence="components">{siteDetailsStyles}</style>
      <div className="hb-container">
        <nav className="hb-crumbs" aria-label={t('Breadcrumb')}>
          <ol>
            <li><SmartLink href={resultsHref || '/explore'}>{resultsHref ? t('Return to results') : t('Explore Cards')}</SmartLink></li>
            {firstDeck && <li><SmartLink href={firstDeck.href}>{t(firstDeck.title)}</SmartLink></li>}
            <li aria-current="page">{site.name}</li>
          </ol>
        </nav>

        <header className="hb-site__hero">
          <div className="hb-site__intro">
            <p className="hb-eyebrow">{[t(site.siteType), site.archiveNo].filter(Boolean).join(' · ')}</p>
            <h1 className="hb-site__title">{site.name}</h1>
            {site.shortDescription && <p className="hb-site__lede">{site.shortDescription}</p>}

            {(site.isUnesco || site.modelResources.length > 0) && (
              <ul className="hb-site__badges" aria-label={t('Designation and digital assets')}>
                {site.isUnesco && <li><span className="hb-site__badge">UNESCO</span></li>}
                {site.modelResources.length > 0 && <li>{site.modelResources.length ? <a className="hb-site__badge" href="#model">{t('View 3D model')}</a> : <span className="hb-site__badge">{t('3D documented · model link pending')}</span>}</li>}
              </ul>
            )}
            <ShareSite key={site.id} site={site} />
          </div>
          <div className="hb-site__card">
            <HeritageCard site={site} headingLevel={null} interactive={false} priority />
          </div>
          <section className="hb-site__metadata" aria-labelledby="site-metadata-title">
            <h2 id="site-metadata-title" className="hb-site__metadata-title">{t('Site information')}</h2>
            {factGroups.map((group) => (
              <div className="hb-site__fact-group" key={group.title}>
                <h3>{group.title}</h3>
                <dl className="hb-facts">
                  {group.rows.map(([label, value]) => (
                    <div className="hb-facts__row" key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}
                </dl>
              </div>
            ))}

            {decks.length > 0 && (
              <div className="hb-site__decks">
                <h3 className="hb-site__decks-title">{t('In these decks')}</h3>
                <ul className="hb-chips hb-chips--row">
                  {decks.map((deck) => (
                    <li key={deck.id}><SmartLink className="hb-tag" href={deck.href}>{t(deck.title)}</SmartLink></li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </header>

        <SectionNav items={sections} />

        {sections.map((section) => (
          <SiteSection id={section.id} title={section.title} key={section.id}>{section.body}</SiteSection>
        ))}
      </div>
    </main>
  );
}
