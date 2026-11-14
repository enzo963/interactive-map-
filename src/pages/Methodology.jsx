import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import '../styles/pages.css';
import '../styles/project-pages.css';
import { t } from '../i18n';

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
      <PageHeader eyebrow={t('How we build the archive')} title={t('Methodology & Sources')}
        lede={t('A clear path from a source to a published record, with evidence, review and room for uncertainty at every stage.')} />
      <div className="hb-container hb-project">
        <section className="hb-project__section" aria-labelledby="method-process">
          <h2 id="method-process" className="hb-section-title">{t('From research to publication')}</h2>
          <ol className="hb-project__steps">
            {STEPS.map(([title, text]) => <li key={title}><h3>{t(title)}</h3><p>{t(text)}</p></li>)}
          </ol>
        </section>

        <section className="hb-project__section" aria-labelledby="method-trust">
          <h2 id="method-trust" className="hb-section-title">{t('How we use source trust tiers')}</h2>
          <p className="hb-project__text">{t('Trust tiers help reviewers prioritize sources for the kinds of information they can support. They are a guide to source reliability, not a guarantee that every statement is correct.')}</p>
          <dl className="hb-project__definitions">
            <div><dt>{t('Tier 1 · Official heritage sources')}</dt><dd>{t('UNESCO, its advisory bodies and government heritage authorities. These sources have the highest priority for relevant heritage information within their remit.')}</dd></div>
            <div><dt>{t('Tier 2 · Research and cultural institutions')}</dt><dd>{t('Academic publications, universities, archaeological missions, museums, archives, research institutes, cultural heritage organisations and other official government bodies.')}</dd></div>
            <div><dt>{t('Tier 3 · Reference and reporting')}</dt><dd>{t('Encyclopaedias, established news organisations and non-specialist NGOs. These can support a record, with relevant stronger sources taking priority.')}</dd></div>
            <div><dt>{t('Tier 4 · Discovery sources')}</dt><dd>{t('Tourism, travel, commercial and personal sites and user-contributed databases can help find places to research. They do not count as supporting evidence for a card.')}</dd></div>
            <div><dt>{t('Location and image sources')}</dt><dd>{t('Coordinate lookups and media hosts, including Wikidata and Wikimedia Commons, help locate or illustrate a place. They do not count as supporting evidence for a card. Every image still needs a site association, attribution and a license check.')}</dd></div>
          </dl>
          <p className="hb-project__text">{t('A lower tier number gives a relevant source higher priority when claims differ. Equal-tier disagreements remain unresolved until reviewed. Stronger priority never removes conflicting evidence or replaces editorial judgment. Listing a source here does not imply a partnership or endorsement.')}</p>
        </section>

        <section className="hb-project__section" aria-labelledby="method-uncertainty">
          <h2 id="method-uncertainty" className="hb-section-title">{t('What a record can—and cannot—tell you')}</h2>
          <ul className="hb-project__cards">
            <li><h3>{t('Unknown stays unknown')}</h3><p>{t('A missing date, location or model is not filled in by guesswork. Unknown UNESCO or 3D availability is different from a confirmed negative.')}</p></li>
            <li><h3>{t('Designations need context')}</h3><p>{t('A UNESCO Tentative List entry is distinct from an inscribed World Heritage property. A building within a larger area does not automatically have a separate inscription.')}</p></li>
            <li><h3>{t('Models need verification')}</h3><p>{t('A link or collection label alone does not verify a 3D resource. Published model resources must belong to an approved record and meet the archive’s verification requirements.')}</p></li>
          </ul>
        </section>

        <section className="hb-project__section" aria-labelledby="method-rights">
          <h2 id="method-rights" className="hb-section-title">{t('Images, attribution and rights')}</h2>
          <div className="hb-project__prose">
            <p>{t('Finding an image online does not establish permission to publish it. Review considers whether the image depicts the correct site, who made it, where it came from and which license or permission applies.')}</p>
            <p>{t('Verified, unverified, restricted and unknown licensing states remain distinct. An unverified or unknown license is never presented as permission. Written record approval does not automatically approve its images, and attribution alone does not grant publication rights.')}</p>
          </div>
        </section>

        <aside className="hb-project__callout" aria-labelledby="method-read">
          <h2 id="method-read">{t('Read the sources behind a place')}</h2>
          <p>{t('Site pages show the available references and image credits. Follow those citations to examine a claim in its original context, and prepare a source-backed correction if something needs another look.')}</p>
          <div className="hb-project__actions">
            <SmartLink className="hb-btn hb-btn--ink" href="/explore">{t('Explore site records')}</SmartLink>
            <SmartLink className="hb-link" href="/contact">{t('Contribution guidance')}</SmartLink>
          </div>
        </aside>
      </div>
    </main>
  );
}
