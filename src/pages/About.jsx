import PageHeader from '../components/common/PageHeader';
import HeritageCard from '../components/cards/HeritageCard';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { CARD_TYPES } from '../data/cardTypes';
import { CARD_TYPE_NOTES } from '../data/cardTypeNotes';
import { makeSpecimen } from '../utils/specimen';
import '../styles/pages.css';
import '../styles/project-pages.css';

const LEGEND = [
  ['Archive number', 'A catalogue identifier: the archive’s legacy “HB” prefix, then a two-letter governorate code, then the record number. Existing identifiers are retained so records stay consistent.'],
  ['Card type', 'The age class of the site, from Type I to Type V.'],
  ['Image', 'The main image of the site, when one is available.'],
  ['Name and category', 'What the site is called and what kind of site it is.'],
  ['Place and period', 'The governorate, and the historical period recorded for the site.'],
  ['Date', 'The approximate date recorded for the site.'],
];

export default function About() {
  useDocumentTitle('About History in Cards');
  const specimen = makeSpecimen(CARD_TYPES[CARD_TYPES.length - 1]);

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow="The project"
        title="About History in Cards"
        lede="Connecting people with Iraq’s heritage through accessible records, responsible research and digital documentation."
      />

      <div className="hb-container hb-about">
        <section className="hb-project__intro" aria-labelledby="about-mission">
          <div>
            <p className="hb-eyebrow">Our mission</p>
            <h2 id="about-mission" className="hb-project__headline">A bridge between places, their histories and the people who discover them.</h2>
          </div>
          <div className="hb-project__prose">
            <p>History in Cards is an interactive digital archive of Iraq’s historical, archaeological, religious, architectural and cultural places. Each site becomes a heritage card that opens a fuller record of its history, location and sources.</p>
            <p>Our mission is to make heritage easier to discover and understand, while keeping the evidence behind each record visible. The archive brings geographical exploration, historical context and digital resources together for visitors, students, researchers and institutions.</p>
          </div>
        </section>

        <section className="hb-project__section" aria-labelledby="about-goals">
          <h2 id="about-goals" className="hb-section-title">What we are working toward</h2>
          <ul className="hb-project__cards">
            <li><h3>Discovery and learning</h3><p>Help people move from a familiar place to a new story through the map, collections and historical periods.</p></li>
            <li><h3>Responsible research</h3><p>Connect descriptions to their sources, acknowledge gaps and keep uncertain information open to review.</p></li>
            <li><h3>Digital preservation</h3><p>Build a foundation for photographs, surveys and verified 3D resources that support understanding and future study.</p></li>
          </ul>
        </section>

        <section className="hb-project__section" aria-labelledby="about-scope">
          <h2 id="about-scope" className="hb-section-title">Our current scope</h2>
          <div className="hb-project__prose">
            <p>The archive currently focuses on northern and central Iraq: Nineveh, Erbil, Duhok, Sulaymaniyah, Kirkuk, Baghdad and Salah al-Din. Coverage grows through research and review; it is not a complete inventory of every heritage place in these governorates.</p>
            <p>A digital record supports access and learning. It does not replace conservation, local knowledge, specialist research or the care of a physical site. Our long-term goal is to connect these forms of knowledge through clear, well-sourced documentation.</p>
          </div>
          <div className="hb-project__actions">
            <SmartLink className="hb-link" href="/map">Explore the geographic archive</SmartLink>
            <SmartLink className="hb-link" href="/our-work">Discover our areas of work</SmartLink>
          </div>
        </section>

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
          <SmartLink className="hb-link" href="/methodology">Read our methodology and source standards</SmartLink>
        </section>

        <p className="hb-about__cta">
          <SmartLink className="hb-btn hb-btn--ink" href="/explore">Explore Cards</SmartLink>
          <SmartLink className="hb-link" href="/map">Open the map</SmartLink>
        </p>
      </div>
    </main>
  );
}
