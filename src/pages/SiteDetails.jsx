import { useMemo } from 'react';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import Gallery from '../components/site/Gallery';
import SiteLocation from '../components/site/SiteLocation';
import SectionNav from '../components/site/SectionNav';
import { Documentation, ModelViewer, Overview, Sources, SiteSection, Timeline, VideoPlayer } from '../components/site/SiteSections';
import NotFound from './NotFound';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { getDecksForSite } from '../utils/decks';
import { getRelatedSites } from '../utils/related';
import { getGovernorateKey } from '../data/governorates';
import '../styles/site-details.css';
import '../styles/phase4.css';

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


const safeImageLink = (value, local = false) => {
  if (typeof value !== 'string' || !value || /[\s\\]/.test(value)) return '';
  if (local && value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};
const imageLicenseState = (image) => {
  const states = [image.license_status, image.licenseStatus].filter(Boolean);
  if (states.includes('restricted') || image.license_review?.permission === 'restricted'
    || (Array.isArray(image.source_observations) && image.source_observations.some((item) => item
      && (item.license_status === 'restricted' || item.licenseStatus === 'restricted' || item.license_review?.permission === 'restricted')))) return 'restricted';
  if (states.length && states.every((state) => state === 'verified') && image.license_tracking?.evidence_valid === true
    && Array.isArray(image.license_tracking.evidence_checks) && image.license_tracking.evidence_checks.length > 0
    && image.license_tracking.evidence_checks.every((check) => check?.valid === true)
    && image.license_review?.permission === 'publication-permitted'
    && typeof image.license_review.reviewedBy === 'string' && image.license_review.reviewedBy.trim()
    && Number.isFinite(Date.parse(image.license_review.reviewedAt))
    && safeImageLink(image.license_review.image_url, true) === safeImageLink(image.src, true)
    && Array.isArray(image.license_review.evidence) && image.license_review.evidence.length > 0) return 'verified';
  return states.includes('unverified') || states.includes('verified') ? 'unverified' : 'unknown';
};
function ImageAttribution({ image }) {
  const observations = [image, ...(Array.isArray(image.source_observations) ? image.source_observations : [])];
  const clean = (value) => typeof value === 'string' ? value.trim() : '';
  const sources = observations.filter((item) => item && typeof item === 'object').map((item) => {
    const url = safeImageLink(item.sourceUrl || item.source_url);
    const name = clean(item.sourceName) || clean(item.source_name) || (url ? new URL(url).hostname : '');
    return { url, name, credit: clean(item.credit) };
  }).filter((item, index, all) => (item.url || item.name || item.credit)
    && all.findIndex((other) => other.url === item.url && other.name === item.name && other.credit === item.credit) === index);
  const state = imageLicenseState(image);
  return <div className="hb-image-attribution">
    {sources.map((source, i) => <p key={i}>
      {source.credit && <span>Credit: {source.credit}. </span>}
      {(source.url || source.name) && <>Source: {source.url
        ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name || 'Image source'}<span className="sr-only"> (opens in a new tab)</span></a>
        : source.name}</>}
    </p>)}
    <p>{state === 'verified' && image.license ? <>License: {safeImageLink(image.license_url)
      ? <a href={safeImageLink(image.license_url)} target="_blank" rel="noopener noreferrer">{image.license}</a> : image.license}</>
      : state === 'restricted' ? 'Image use is restricted.' : `License ${state === 'unverified' ? 'unverified' : 'unknown'}; reuse permission has not been confirmed.`}</p>
  </div>;
}

/**
 * /sites/:slug — ONE template for every site.
 * `sections` is built first; optional media sections require data, while sources
 * always shows either references or an explicit missing-reference message.
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
  const authoredMedia = [site.coverImage, ...site.galleryImages];
  const restrictedUrls = new Set(authoredMedia.filter((image) => image && imageLicenseState(image) === 'restricted').map((image) => image.src));
  const media = authoredMedia.filter((image, index, all) => image
    && safeImageLink(image.src, true) && !restrictedUrls.has(image.src)
    && (!image.siteId || image.siteId === site.id) && all.findIndex((other) => other?.src === image.src) === index);
  const hasCredits = media.length > 0 || site.imageCredit;

  const factGroups = [
    {
      title: 'Archive record',
      rows: [
        ['Archive number', site.archiveNo],
        ['Card type', `${cardType.shortLabel}${cardType.rankLabel ? ` · ${cardType.rankLabel}` : ''} (${cardType.rangeLabel})`],
        ['Date', site.dateLabel],
        ['Period', site.period],
        ['Civilization', site.civilization],
        ['Site type', site.siteType],
      ],
    },
    {
      title: 'Place',
      rows: [['Governorate', site.governorate], ['City', site.city], ['Country', site.country]],
    },
    {
      title: 'Status and verification',
      rows: [
        ['Heritage status', site.heritageStatus],
        ['Preservation', site.preservationStatus],
        ['UNESCO status', site.unescoStatus || (site.isUnesco ? 'Yes' : '')],
        ['Verification', site.verificationStatus],
        ['Last verified', site.lastVerified],
      ],
    },
  ].map((group) => ({ ...group, rows: group.rows.filter(([, value]) => value) })).filter((group) => group.rows.length > 0);

  const sections = [
    (site.description || site.historicalBackground) && {
      id: 'overview', title: 'Historical overview', body: <Overview text={site.description} background={site.historicalBackground} />,
    },
    site.timeline.length > 0 && { id: 'timeline', title: 'Historical timeline', body: <Timeline items={site.timeline} /> },
    { id: 'gallery', title: 'Gallery', body: media.length > 0 ? <><p className="hb-site__section-intro">{media.length} {media.length === 1 ? 'image' : 'images'}. Select an image to open the viewer.</p><Gallery key={site.id} images={media} renderAttribution={(image) => <ImageAttribution image={image} />} /></> : <p className="hb-site__section-intro">No images are available for this site yet.</p> },
    hasLocation && { id: 'location', title: 'Location', body: <SiteLocation site={site} neighbours={neighbours} /> },
    site.modelUrl && { id: 'model', title: '3D model', body: <ModelViewer url={site.modelUrl} name={site.name} /> },
    site.videoUrl && { id: 'video', title: 'Video', body: <VideoPlayer url={site.videoUrl} name={site.name} /> },
    hasDocumentation && {
      id: 'documentation',
      title: 'Digital documentation',
      body: <Documentation types={site.ourWorkTypes} note={site.ourWorkNote} meta={site.documentationMeta} assets={site.digitalAssets} />,
    },
    { id: 'sources', title: 'Sources and references', body: site.sources.length > 0 ? <Sources items={site.sources} /> : <p className="hb-site__section-intro">No source references have been added to this record yet.</p> },
    hasCredits && {
      id: 'credits',
      title: 'Image sources and licensing',
      body: <div className="hb-prose">{site.imageCredit && <p>Image credit: {site.imageCredit}</p>}
        <ul className="hb-credits">{media.map((image) => <li key={image.src}><p>{image.alt}</p><ImageAttribution image={image} /></li>)}</ul>
      </div>,
    },
    related.length > 0 && {
      id: 'related',
      title: 'Related cards',
      body: (
        <>
          <p className="hb-site__section-intro">Continue exploring with related records from the archive.</p>
          <ul className="hb-related">
            {related.map((other) => (
              <li key={other.id}><HeritageCard site={other} headingLevel={3} showCta /></li>
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
        <nav className="hb-crumbs" aria-label="Breadcrumb">
          <ol>
            <li><SmartLink href="/explore">Explore Cards</SmartLink></li>
            {firstDeck && <li><SmartLink href={firstDeck.href}>{firstDeck.title}</SmartLink></li>}
            <li aria-current="page">{site.name}</li>
          </ol>
        </nav>

        <header className="hb-site__hero">
          <div className="hb-site__intro">
            <p className="hb-eyebrow">{[site.siteType, site.archiveNo].filter(Boolean).join(' · ')}</p>
            <h1 className="hb-site__title">{site.name}</h1>
            {site.shortDescription && <p className="hb-site__lede">{site.shortDescription}</p>}

            {(site.isUnesco || site.hasModel) && (
              <ul className="hb-site__badges" aria-label="Designation and digital assets">
                {site.isUnesco && <li><span className="hb-site__badge">UNESCO</span></li>}
                {site.hasModel && <li>{site.modelUrl ? <a className="hb-site__badge" href="#model">View 3D model</a> : <span className="hb-site__badge">3D documented · model link pending</span>}</li>}
              </ul>
            )}
          </div>
          <div className="hb-site__card">
            <HeritageCard site={site} headingLevel={null} interactive={false} priority />
          </div>
          <section className="hb-site__metadata" aria-labelledby="site-metadata-title">
            <h2 id="site-metadata-title" className="hb-site__metadata-title">Site information</h2>
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
                <h3 className="hb-site__decks-title">In these decks</h3>
                <ul className="hb-chips hb-chips--row">
                  {decks.map((deck) => (
                    <li key={deck.id}><SmartLink className="hb-tag" href={deck.href}>{deck.title}</SmartLink></li>
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
