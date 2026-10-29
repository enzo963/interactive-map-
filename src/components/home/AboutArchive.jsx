import SmartLink from '../common/SmartLink';
import '../../styles/phase4.css';

const POINTS = [
  ['Every record is a card', 'Each heritage site in the archive becomes a card with an archive number, a type and a place.'],
  ['Type and deck are different', 'A card has one type, set by the age of the site, and can belong to many decks.'],
  ['Verified, with sources', 'Records show their verification status and sources where they exist.'],
  ['Documented digitally', 'Where the project has documented a site, its methods and digital assets are recorded on the card.'],
];

/** Short, restrained introduction near the end of the Home page. Static copy, no statistics. */
export default function AboutArchive() {
  return (
    <section className="hb-about-home" aria-labelledby="about-home-title">
      <div className="hb-container hb-about-home__grid">
        <div>
          <h2 id="about-home-title" className="hb-about-home__title">About the archive</h2>
          <p className="hb-about-home__lede">
            Heritage Bridge is a digital archive of heritage sites in Iraq, beginning with the north.
          </p>
          <SmartLink className="hb-link" href="/about">Read more about the archive</SmartLink>
        </div>
        <dl className="hb-about-home__points">
          {POINTS.map(([term, text]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
