import { useMemo } from 'react';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import Gallery from '../components/site/Gallery';
import SiteLocation from '../components/site/SiteLocation';
import { Documentation, ImageCredit, ModelViewer, Overview, Sources, SiteSection, Timeline, VideoPlayer } from '../components/site/SiteSections';
import NotFound from './NotFound';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/I18nContext';
import { getAllSites } from '../services/siteService';
import { getDecksForSite } from '../utils/decks';
import { getRelatedSites } from '../utils/related';
import { getGovernorateKey } from '../data/governorates';
import '../styles/site-details.css';

/**
 * /sites/:slug — ONE template for every site.
 * Every optional section appears only when the record has data for it.
 */
export default function SiteDetails({ params }) {
  const { t, ls, ld, pageTitle } = useI18n();
  const sites = useMemo(() => getAllSites(), []);
  const site = useMemo(() => sites.find((s) => s.slug === params.slug) ?? null, [sites, params.slug]);
  const related = useMemo(() => (site ? getRelatedSites(site, sites, 4) : []), [site, sites]);
  const neighbours = useMemo(
    () => (site ? sites.filter((s) => s.id !== site.id && getGovernorateKey(s.governorate) === getGovernorateKey(site.governorate)) : []),
    [site, sites],
  );

  const text = site ? ls(site) : null;
  useDocumentTitle(pageTitle(text ? text.name : t('nf.title')));
  if (!site) return <NotFound title={t('nf.title')} message={t('nf.siteMessage')} />;

  const { cardType } = text;
  const decks = getDecksForSite(site).map((deck) => ({ ...deck, title: ld(deck).title }));
  const hasLocation = Number.isFinite(site.latitude) && Number.isFinite(site.longitude);

  const facts = [
    [t('fact.archiveNo'), site.archiveNo, 'ltr'],
    [t('fact.cardType'), `${cardType.shortLabel}${cardType.rankLabel ? ` · ${cardType.rankLabel}` : ''} (${cardType.rangeLabel})`],
    [t('fact.date'), text.dateLabel],
    [t('fact.period'), text.period],
    [t('fact.civilization'), text.civilization],
    [t('fact.siteType'), text.siteType],
    [t('fact.governorate'), text.governorate],
    [t('fact.city'), text.city],
    [t('fact.heritageStatus'), text.heritageStatus],
    [t('fact.unesco'), text.unescoStatus || (site.isUnesco ? t('fact.yes') : '')],
    [t('fact.verification'), text.verificationStatus],
  ].filter(([, value]) => value);

  const firstGov = decks[0];

  return (
    <main id="main" tabIndex={-1} className="hb-page hb-site">
      <div className="hb-container">
        <nav className="hb-crumbs" aria-label={t('common.breadcrumb')}>
          <ol>
            <li><SmartLink href="/explore">{t('nav.explore')}</SmartLink></li>
            {firstGov && <li><SmartLink href={firstGov.href}>{firstGov.title}</SmartLink></li>}
            <li aria-current="page">{text.name}</li>
          </ol>
        </nav>

        <header className="hb-site__hero">
          <div className="hb-site__card">
            <HeritageCard site={site} headingLevel={null} interactive={false} priority />
            {site.image && site.imageCredit && <ImageCredit credit={site.imageCredit} />}
          </div>
          <div className="hb-site__intro">
            <p className="hb-eyebrow">{[text.siteType, site.archiveNo].filter(Boolean).join(' · ')}</p>
            <h1 className="hb-site__title">{text.name}</h1>
            {text.shortDescription && <p className="hb-site__lede">{text.shortDescription}</p>}

            <dl className="hb-facts">
              {facts.map(([label, value, direction]) => (
                <div className="hb-facts__row" key={label}>
                  <dt>{label}</dt>
                  <dd>{direction ? <bdi dir={direction}>{value}</bdi> : value}</dd>
                </div>
              ))}
            </dl>

            {decks.length > 0 && (
              <div className="hb-site__decks">
                <h2 className="hb-site__decks-title">{t('site.inDecks')}</h2>
                <ul className="hb-chips hb-chips--row">
                  {decks.map((deck) => (
                    <li key={deck.id}><SmartLink className="hb-tag" href={deck.href}>{deck.title}</SmartLink></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </header>

        {text.description && (
          <SiteSection id="overview" title={t('section.overview')}><Overview text={text.description} /></SiteSection>
        )}
        {site.timeline.length > 0 && (
          <SiteSection id="timeline" title={t('section.timeline')}><Timeline items={site.timeline} /></SiteSection>
        )}
        {site.gallery.length > 0 && (
          <SiteSection id="gallery" title={t('section.gallery')}><Gallery images={site.gallery} name={text.name} /></SiteSection>
        )}
        {hasLocation && (
          <SiteSection id="location" title={t('section.location')}><SiteLocation site={site} neighbours={neighbours} /></SiteSection>
        )}
        {site.modelUrl && (
          <SiteSection id="model" title={t('section.model')}><ModelViewer url={site.modelUrl} name={text.name} /></SiteSection>
        )}
        {site.videoUrl && (
          <SiteSection id="video" title={t('section.video')}><VideoPlayer url={site.videoUrl} name={text.name} /></SiteSection>
        )}
        {(site.ourWorkTypes.length > 0 || site.ourWorkNote) && (
          <SiteSection id="documentation" title={t('section.documentation')}>
            <Documentation types={site.ourWorkTypes} note={site.ourWorkNote} />
          </SiteSection>
        )}
        {site.sources.length > 0 && (
          <SiteSection id="sources" title={t('section.sources')}><Sources items={site.sources} /></SiteSection>
        )}
        {related.length > 0 && (
          <SiteSection id="related" title={t('section.related')}>
            <ul className="hb-related">
              {related.map((other) => (
                <li key={other.id}><HeritageCard site={other} headingLevel={3} showCta /></li>
              ))}
            </ul>
          </SiteSection>
        )}
      </div>
    </main>
  );
}
