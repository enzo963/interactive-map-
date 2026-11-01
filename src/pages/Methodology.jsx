import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import '../styles/pages.css';
import '../styles/project-pages.css';

const STEPS = [
  ['Identify the place', 'Establish the site’s identity, governorate and alternative names. Similar names or a shared location are reasons to investigate, not reasons to combine two records.'],
  ['Gather sources and evidence', 'Collect relevant information from trusted sources and retain its origin. Evidence connects a specific statement or image to the reference that supports it, so a reviewer can check the claim in context.'],
  ['Compare and verify', 'Compare names, descriptions, dates and locations across available references. Preserve conflicting information for review instead of silently replacing it. Possible duplicates are investigated before records are combined.'],
  ['Review the record and its images', 'Check that the description matches the place, sources support the claims and uncertainty is stated honestly. Review image relevance, authorship, attribution and license evidence separately from the written record.'],
  ['Approve for publication', 'Only approved heritage records enter a published export. A collected draft is not publication approval. Images also need explicit permission and publication review before they can be used as card covers.'],
  ['Keep the record open to correction', 'Review new evidence and corrections as they become available. An approved record represents the reviewed information available at that point, rather than a claim that research is finished.'],
];

export default function Methodology() {
  useDocumentTitle('Methodology & Sources — History in Cards');
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow="How we build the archive" title="Methodology & Sources"
        lede="A clear path from a source to a published record, with evidence, review and room for uncertainty at every stage." />
      <div className="hb-container hb-project">
        <section className="hb-project__section" aria-labelledby="method-process">
          <h2 id="method-process" className="hb-section-title">From research to publication</h2>
          <ol className="hb-project__steps">
            {STEPS.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
        </section>

        <section className="hb-project__section" aria-labelledby="method-trust">
          <h2 id="method-trust" className="hb-section-title">How we use source trust tiers</h2>
          <p className="hb-project__text">Trust tiers help reviewers prioritize sources for the kinds of information they can support. They are a guide to source reliability, not a guarantee that every statement is correct.</p>
          <dl className="hb-project__definitions">
            <div><dt>Tier 1 · Official heritage sources</dt><dd>UNESCO World Heritage Centre, official Iraqi heritage authorities and Kurdistan Regional Government sources. These are prioritized for relevant official designations, heritage information and descriptions within their remit.</dd></div>
            <div><dt>Tier 2 · Supporting image sources</dt><dd>Wikimedia Commons is used for image candidates and image metadata. Every image still needs a site association, attribution and a license check. An image repository does not establish a site’s UNESCO status or verify all of its history.</dd></div>
          </dl>
          <p className="hb-project__text">A lower tier number gives a relevant source higher priority when claims differ. Equal-tier disagreements remain unresolved until reviewed. Stronger priority never removes conflicting evidence or replaces editorial judgment. Listing a source here does not imply a partnership or endorsement.</p>
        </section>

        <section className="hb-project__section" aria-labelledby="method-uncertainty">
          <h2 id="method-uncertainty" className="hb-section-title">What a record can—and cannot—tell you</h2>
          <ul className="hb-project__cards">
            <li><h3>Unknown stays unknown</h3><p>A missing date, location or model is not filled in by guesswork. Unknown UNESCO or 3D availability is different from a confirmed negative.</p></li>
            <li><h3>Designations need context</h3><p>A UNESCO Tentative List entry is distinct from an inscribed World Heritage property. A building within a larger area does not automatically have a separate inscription.</p></li>
            <li><h3>Models need verification</h3><p>A link or collection label alone does not verify a 3D resource. Published model resources must belong to an approved record and meet the archive’s verification requirements.</p></li>
          </ul>
        </section>

        <section className="hb-project__section" aria-labelledby="method-rights">
          <h2 id="method-rights" className="hb-section-title">Images, attribution and rights</h2>
          <div className="hb-project__prose">
            <p>Finding an image online does not establish permission to publish it. Review considers whether the image depicts the correct site, who made it, where it came from and which license or permission applies.</p>
            <p>Verified, unverified, restricted and unknown licensing states remain distinct. An unverified or unknown license is never presented as permission. Written record approval does not automatically approve its images, and attribution alone does not grant publication rights.</p>
          </div>
        </section>

        <aside className="hb-project__callout" aria-labelledby="method-read">
          <h2 id="method-read">Read the sources behind a place</h2>
          <p>Site pages show the available references and image credits. Follow those citations to examine a claim in its original context, and prepare a source-backed correction if something needs another look.</p>
          <div className="hb-project__actions">
            <SmartLink className="hb-btn hb-btn--ink" href="/explore">Explore site records</SmartLink>
            <SmartLink className="hb-link" href="/contact">Contribution guidance</SmartLink>
          </div>
        </aside>
      </div>
    </main>
  );
}
