import PageHeader from '../components/common/PageHeader';
import CardGrid from '../components/common/CardGrid';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAllSites } from '../services/siteService';
import { getDocumentationSummary } from '../utils/documentation';
import { isApprovedSite } from '../utils/modelResources';
import '../styles/pages.css';
import '../styles/project-pages.css';

const AREAS = [
  ['Photogrammetry', 'Using overlapping photographs to study a place’s form and create measurable digital representations. A published survey should explain its coverage, authorship and limitations.'],
  ['Digital reconstruction', 'Exploring how a place may have appeared through evidence-led interpretation. Reconstructions should distinguish surviving evidence from informed interpretation and unresolved details.'],
  ['3D documentation', 'Making verified models and supporting context available for close study. Digital assets need clear provenance, appropriate permissions and an explanation of what they represent.'],
  ['Research and interpretation', 'Bringing together reliable references, historical context and alternative names to make each record useful for learning and further research.'],
  ['Heritage preservation', 'Supporting awareness and a lasting record of places at risk through responsible documentation. Digital work complements the expertise and care needed for physical conservation.'],
];

export default function OurWork() {
  useDocumentTitle('Our Work — History in Cards');
  const { documented } = getDocumentationSummary(getAllSites().filter(isApprovedSite));
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow="Documentation and preservation" title="Our Work"
        lede="Research today, a foundation for digital heritage tomorrow. Explore the work we aim to develop and the documentation published in the archive." />
      <div className="hb-container hb-project">
        <section className="hb-project__section" aria-labelledby="work-areas">
          <h2 id="work-areas" className="hb-section-title">Our areas of work</h2>
          <p className="hb-project__text">These areas describe the project’s direction and intended methods. They are not a list of completed field projects. Published documentation appears separately below when an approved record identifies first-hand work by History in Cards.</p>
          <ul className="hb-project__cards hb-project__cards--two">
            {AREAS.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}
          </ul>
        </section>

        <section className="hb-project__section" aria-labelledby="work-published">
          <h2 id="work-published" className="hb-section-title">Published project documentation</h2>
          {documented.length ? (
            <>
              <p className="hb-project__text">These approved site records identify first-hand project documentation. Open a record to see its recorded methods, sources and available assets.</p>
              <CardGrid sites={documented} />
            </>
          ) : (
            <div className="hb-empty">
              <h3 className="hb-empty__title">No published project documentation yet</h3>
              <p>There are currently no approved site records identifying first-hand History in Cards documentation. Source-based archive research remains available through Explore Cards.</p>
              <SmartLink className="hb-link" href="/explore">Explore the heritage archive</SmartLink>
            </div>
          )}
          <div className="hb-project__actions">
            <SmartLink className="hb-link" href="/decks/our-work">Our Documentation collection</SmartLink>
            <SmartLink className="hb-link" href="/3d-archive">Browse verified 3D resources</SmartLink>
          </div>
        </section>

        <aside className="hb-project__callout" aria-labelledby="work-contribute">
          <h2 id="work-contribute">Build a stronger record of heritage</h2>
          <p>Researchers, students and institutions can help identify references, improve historical context and prepare responsibly documented material. Read our approach and contribution guidance before preparing information.</p>
          <div className="hb-project__actions">
            <SmartLink className="hb-btn hb-btn--ink" href="/methodology">Our methodology</SmartLink>
            <SmartLink className="hb-link" href="/contact">Ways to contribute</SmartLink>
          </div>
        </aside>
      </div>
    </main>
  );
}
