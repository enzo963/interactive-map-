import { useMemo } from 'react';
import HeritageCard from '../cards/HeritageCard';
import SmartLink from '../common/SmartLink';
import { cardsLabel } from '../../utils/archiveStats';
import { getDocumentationSummary } from '../../utils/documentation';
import { selectFeaturedSites } from '../../utils/selectSites';
import '../../styles/phase4.css';

/**
 * Sites documented first-hand by the project. Entirely data-driven: when no site is marked as
 * documented, the section does not render at all.
 */
export default function OurDocumentation({ sites }) {
  const { documented, types } = useMemo(() => getDocumentationSummary(sites), [sites]);
  const featured = useMemo(() => selectFeaturedSites(documented, 3), [documented]);
  if (documented.length === 0) return null;

  return (
    <section className="hb-docs" aria-labelledby="docs-title">
      <div className="hb-container">
        <header className="hb-section-head">
          <h2 id="docs-title" className="hb-section-title">Our Documentation</h2>
          <p className="hb-section-meta">{cardsLabel(documented.length)} documented by the project</p>
        </header>

        <div className="hb-docs__grid">
          <div className="hb-docs__text">
            <p className="hb-docs__lede">
              Some sites are documented directly by Heritage Bridge. Their cards link to the methods and digital
              assets recorded for them.
            </p>
            {types.length > 0 && (
              <dl className="hb-docs__types">
                {types.map((type) => (
                  <div key={type.label}>
                    <dt>{type.label}</dt>
                    <dd>{cardsLabel(type.count)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <SmartLink className="hb-link" href="/decks/our-work">Open the Our Documentation deck</SmartLink>
          </div>

          <ul className="hb-docs__cards">
            {featured.map((site) => (
              <li key={site.id}>
                <HeritageCard site={site} headingLevel={3} showCta />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
