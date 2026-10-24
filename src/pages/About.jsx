import PageHeader from '../components/common/PageHeader';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { CARD_TYPES } from '../data/cardTypes';
import { CARD_TYPE_NOTES } from '../data/cardTypeNotes';
import { makeSpecimen } from '../utils/specimen';
import '../styles/pages.css';

const LEGEND = [
  ['Archive number', 'A catalogue identifier. “HB” is Heritage Bridge, then a two-letter governorate code, then the record number.'],
  ['Card type', 'The age class of the site, from Type I to Type V.'],
  ['Image', 'The main image of the site, when one is available.'],
  ['Name and category', 'What the site is called and what kind of site it is.'],
  ['Place and period', 'The governorate, and the historical period recorded for the site.'],
  ['Date', 'The approximate date recorded for the site.'],
];

export default function About() {
  useDocumentTitle('About the archive — Heritage Bridge');
  const specimen = makeSpecimen(CARD_TYPES[CARD_TYPES.length - 1]);

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow="About the archive"
        title="A digital heritage archive, one card at a time"
        lede="Heritage Bridge is an interactive archive of historical, archaeological, architectural and cultural heritage sites in Iraq, beginning with the north."
      />

      <div className="hb-container hb-about">
        <section className="hb-about__block" aria-labelledby="about-cards">
          <h2 id="about-cards" className="hb-section-title">How to read a card</h2>
          <div className="hb-about__split">
            <div className="hb-about__card"><HeritageCard site={specimen} headingLevel={null} /></div>
            <dl className="hb-about__legend">
              {LEGEND.map(([term, text]) => (
                <div key={term}><dt>{term}</dt><dd>{text}</dd></div>
              ))}
            </dl>
          </div>
          <p className="hb-about__note">The card above is a specimen, shown only to explain the layout. It is not a real record.</p>
        </section>

        <section className="hb-about__block" aria-labelledby="about-types">
          <h2 id="about-types" className="hb-section-title">Card type and deck are different things</h2>
          <p className="hb-about__text">
            A card has exactly one <strong>type</strong>, set by the approximate age of the site. A card can belong to
            many <strong>decks</strong>: collections such as a governorate, UNESCO, Lost Heritage, Our Documentation or
            the 3D Archive.
          </p>
          <ul className="hb-about__types">
            {CARD_TYPES.map((type) => (
              <li key={type.id}>
                <span className="hb-about__type-name">{type.shortLabel}{type.rankLabel ? ` · ${type.rankLabel}` : ''}</span>
                <span className="hb-about__type-range">{type.rangeLabel}</span>
                <span className="hb-about__type-note">{CARD_TYPE_NOTES[type.tier]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="hb-about__block" aria-labelledby="about-accuracy">
          <h2 id="about-accuracy" className="hb-section-title">Accuracy and sources</h2>
          <p className="hb-about__text">
            Each record shows its verification status and its sources where they are available. The patterns on card
            backs are original decoration. They are not archaeological evidence and do not reproduce historical symbols.
          </p>
        </section>

        <p className="hb-about__cta">
          <SmartLink className="hb-btn hb-btn--ink" href="/explore">Explore Cards</SmartLink>
          <SmartLink className="hb-link" href="/map">Open the map</SmartLink>
        </p>
      </div>
    </main>
  );
}
