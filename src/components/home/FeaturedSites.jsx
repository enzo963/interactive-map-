import SmartLink from '../common/SmartLink';
import HeritageCard from '../cards/HeritageCard';
import '../../styles/home.css';

/** Featured Cards — asymmetric catalogue spread, not a uniform grid. */
export default function FeaturedSites({ sites, total }) {
  if (sites.length === 0) return null;

  return (
    <section className="hb-featured" aria-labelledby="featured-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="featured-title" className="hb-section-title">Featured Cards</h2>
          <p className="hb-section-meta">
            {sites.length} of {total} in the archive
          </p>
        </header>

        <div className="hb-featured__grid">
          {sites.map((site, index) => (
            <div className="hb-featured__item" data-position={index} key={site.id}>
              <HeritageCard site={site} headingLevel={3} showCta />
            </div>
          ))}

          <aside className="hb-featured__note">
            <p>
              Each card carries an archive number, an age-based type and its place in the record.
              Open one to see the full site.
            </p>
            <SmartLink href="/explore" className="hb-link">
              Browse all cards
            </SmartLink>
          </aside>
        </div>
      </div>
    </section>
  );
}
