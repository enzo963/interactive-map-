import { useMemo } from 'react';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import Gallery from '../components/site/Gallery';
import SiteLocation from '../components/site/SiteLocation';
import SectionNav from '../components/site/SectionNav';
import { Documentation, ModelViewer, Overview, Sources, SiteSection, SiteVideos, Timeline, VideoPlayer } from '../components/site/SiteSections';
import NotFound from './NotFound';
import StatePanel from '../components/common/StatePanel';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { getDecksForSite } from '../utils/decks';
import ShareSite from '../components/site/ShareSite';
import { getSiteShareUrl } from '../utils/siteLinks';
import { getRelatedSiteMatches } from '../utils/related';
import { getGovernorateKey } from '../data/governorates';
import { hasVerifiedPosition, MAP_POSITION_LABELS, MAP_POSITION_NOTES } from '../utils/mapPosition';
import '../styles/site-details.css';
import '../styles/phase4.css';
import { t, tn, tDate } from '../i18n';

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
      {source.credit && <span>{t('Credit:')} {source.credit}. </span>}
      {(source.url || source.name) && <>{t('Source:')} {source.url
        ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name || t('Image source')}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
        : source.name}</>}
    </p>)}
    <p>{state === 'verified' && image.license ? <>{t('License:')} {safeImageLink(image.license_url)
      ? <a href={safeImageLink(image.license_url)} target="_blank" rel="noopener noreferrer">{image.license}</a> : image.license}</>
      : state === 'restricted' ? t('Image use is restricted.') : state === 'unverified' ? t('License unverified; reuse permission has not been confirmed.') : t('License unknown; reuse permission has not been confirmed.')}</p>
  </div>;
}

// Values that only say a fact is not recorded are treated as missing, so their rows disappear.
const UNRECORDED = new Set(['unknown', 'not-recorded', 'not-established', 'n/a', 'none']);
const known = (value) => (typeof value === 'string' && !UNRECORDED.has(value.trim().toLowerCase()) ? value : '');
const VERIFICATION_LABELS = { approved: 'Reviewed and approved', 'needs-review': 'Published, review in progress', draft: 'Draft' };

/** Text that names another record by its ID ("Monument within site-…") shows that record's name as a link. */
function LinkedRecordText({ text, sites }) {
  return text.split(/(site-[a-z0-9-]+)/).map((part, i) => {
    const other = /^site-[a-z0-9-]+$/.test(part) && sites.find((item) => item.id === part);
    return other ? <SmartLink key={i} href={other.href}>{other.name}</SmartLink> : part;
  });
}

/** 3D documentation in two groups, so measured records and modelled reconstructions are never mixed. */
function DocumentationGroups({ resources, site }) {
  const groups = [
    { id: 'measured', title: t('Measured documentation'), intro: t('Captured from the place itself by photogrammetry or laser scanning. These record the site as it was when captured, including damage.') },
    { id: 'modeled', title: t('Modelled and reconstructed'), intro: t('Built by hand by architects and designers, often to show a lost or earlier state. These are interpretations, not measurements.') },
  ];
  const other = resources.filter((resource) => !resource.documentation);
  return <>
    {groups.map((group) => {
      const items = resources.filter((resource) => resource.documentation === group.id);
      return items.length > 0 && <section key={group.id} className="hb-docgroup" aria-labelledby={`doc-${group.id}`}>
        <header className="hb-docgroup__head">
          <h3 id={`doc-${group.id}`} className="hb-site__h3">{group.title} ({items.length})</h3>
          <p className="hb-docgroup__intro">{group.intro}</p>
        </header>
        {items.map((resource) => <ModelViewer key={resource.url} resource={resource} siteId={site.id} name={site.name} headingLevel={4} />)}
      </section>;
    })}
    {other.map((resource) => <ModelViewer key={resource.url} resource={resource} siteId={site.id} name={site.name} />)}
  </>;
}

/**
 * /sites/:slug — ONE template for every site.
 * The hero always carries the name, the card image (or its fallback), the description and the
 * site facts (place, governorate, category, period where known). `sections` is built next: optional
 * sections (overview text beyond the description, timeline, gallery, map, 3D, videos, documentation,
 * credits, related) appear only when they have content, so a sparse record never shows empty panels.
 * Sources are part of the published-card contract and always present.
 * The page renders it, and the "On this page" list is generated from the same array,
 * so neither can drift out of sync.
 */
/** Whether the card has a pin, and why not when it has none. */
function MapPositionNote({ site }) {
  const status = site.mapPosition ?? 'none';
  return (
    <span className={`hb-mappos hb-mappos--${status}`}>
      <strong>{t(MAP_POSITION_LABELS[status])}</strong>{' '}
      <span>{t(MAP_POSITION_NOTES[status])}</span>
    </span>
  );
}

export default function SiteDetails({ params }) {
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
  const hasLocation = hasVerifiedPosition(site);
  const hasDocumentation =
    site.ourWorkTypes.length > 0 || site.ourWorkNote || site.documentationMeta || site.digitalAssets.length > 0;
  const authoredMedia = [site.coverImage, ...site.galleryImages];
  const restrictedUrls = new Set(authoredMedia.filter((image) => image && imageLicenseState(image) === 'restricted').map((image) => image.src));
  const media = authoredMedia.filter((image, index, all) => image
    && safeImageLink(image.src, true) && !restrictedUrls.has(image.src)
    && (!image.siteId || image.siteId === site.id) && all.findIndex((other) => other?.src === image.src) === index);
  const hasCredits = media.length > 0 || site.imageCredit;
  // The description leads the page; a longer overview section appears only when there is more to say.
  const lede = site.shortDescription || site.description;
  const hasDocumentedModels = site.modelResources.some((resource) => resource.documentation);
  const overviewText = site.shortDescription ? site.description : '';

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
      rows: [
        [t('Governorate'), t(site.governorate) || t('Governorate not recorded')], [t('City'), site.city], [t('Country'), t(site.country)],
        [t('Location'), site.approximateLocation],
        [t('Map position'), <MapPositionNote site={site} />],
      ],
    },
    {
      title: t('Status and verification'),
      rows: [
        [t('Heritage status'), known(site.heritageStatus) && <LinkedRecordText text={t(site.heritageStatus)} sites={sites} />],
        [t('Preservation'), known(site.preservationStatus)],
        [t('UNESCO status'), t(known(site.unescoStatus)) || (site.isUnesco ? t('Yes') : '')],
        [t('Verification'), VERIFICATION_LABELS[site.verificationStatus] ? t(VERIFICATION_LABELS[site.verificationStatus]) : t(known(site.verificationStatus))],
        [t('Last verified'), site.lastVerified],
      ],
    },
  ].map((group) => ({ ...group, rows: group.rows.filter(([, value]) => value) })).filter((group) => group.rows.length > 0);

  const sections = [
    overviewText
      ? { id: 'overview', title: t('Historical overview'), body: <Overview text={overviewText} background={site.historicalBackground} /> }
      : site.historicalBackground && { id: 'overview', title: t('Historical background'), body: <Overview text={site.historicalBackground} /> },
    site.timeline.length > 0 && { id: 'timeline', title: t('Historical timeline'), body: <Timeline items={site.timeline} /> },
    media.length > 0 && { id: 'gallery', title: t('Gallery'), body: <><p className="hb-site__section-intro">{tn('{n} image. Select an image to open the viewer.', '{n} images. Select an image to open the viewer.', media.length)}</p><Gallery key={site.id} images={media} renderAttribution={(image) => <ImageAttribution image={image} />} /></> },
    // Governorate, city and country are always in the hero facts; the map appears only for verified coordinates.
    hasLocation && { id: 'location', title: t('Location'), body: <SiteLocation site={site} neighbours={neighbours} /> },
    site.modelResources.length > 0 && {
      id: 'model',
      title: hasDocumentedModels ? t('3D documentation') : t('3D model'),
      body: hasDocumentedModels
        ? <DocumentationGroups resources={site.modelResources} site={site} />
        : site.modelResources.map((resource) => <ModelViewer key={resource.url} resource={resource} siteId={site.id} name={site.name} />),
    },
    // Optional: shown only when a card has videos; a card without one is complete without this section.
    site.videos?.length > 0
      ? { id: 'video', title: site.videos.length > 1 ? t('Videos') : t('Video'), body: <SiteVideos videos={site.videos} name={site.name} /> }
      : site.videoUrl && { id: 'video', title: t('Video'), body: <VideoPlayer url={site.videoUrl} name={site.name} /> },
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
      <link rel="canonical" href={getSiteShareUrl(site)} />
      <div className="hb-container">
        <nav className="hb-crumbs" aria-label={t('Breadcrumb')}>
          <ol>
            <li><SmartLink href="/explore">{t('Explore Cards')}</SmartLink></li>
            {firstDeck && <li><SmartLink href={firstDeck.href}>{t(firstDeck.title)}</SmartLink></li>}
            <li aria-current="page">{site.name}</li>
          </ol>
        </nav>

        <header className="hb-site__hero">
          <div className="hb-site__intro">
            <p className="hb-eyebrow">{[t(site.siteType), site.archiveNo].filter(Boolean).join(' · ')}</p>
            <h1 className="hb-site__title">{site.name}</h1>
            {lede && <p className="hb-site__lede">{lede}</p>}

            {(site.isUnesco || site.modelResources.length > 0) && (
              <ul className="hb-site__badges" aria-label={t('Designation and digital assets')}>
                {site.isUnesco && <li><span className="hb-site__badge">UNESCO</span></li>}
                {site.modelResources.length > 0 && <li><a className="hb-site__badge" href="#model">{hasDocumentedModels ? t('View 3D documentation') : t('View 3D model')}</a></li>}
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
