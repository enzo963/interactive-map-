import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import '../styles/pages.css';
import '../styles/project-pages.css';

export default function Contact() {
  useDocumentTitle('Contact & Contribution — History in Cards');
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow="Take part in the archive" title="Contact & Contribution"
        lede="Good heritage records grow through shared knowledge. Learn what you can contribute and how to prepare information for a future review." />
      <div className="hb-container hb-project">
        <aside className="hb-project__callout" aria-labelledby="contact-availability">
          <p className="hb-eyebrow">Contact channels forthcoming</p>
          <h2 id="contact-availability">Preparing to welcome contributions</h2>
          <p>Official contact details will be added later. We do not currently accept submissions through this page. You can use the guidance below to prepare material for when a public contact channel becomes available.</p>
        </aside>

        <section className="hb-project__section" aria-labelledby="contact-who">
          <h2 id="contact-who" className="hb-section-title">Who can contribute?</h2>
          <p className="hb-project__text">Researchers, students, heritage professionals, institutions, photographers and visitors all bring useful perspectives. A contribution can be a carefully referenced correction, an alternative name or a documented photograph; it does not need to be a large research project.</p>
          <ul className="hb-project__cards">
            <li><h3>Research and corrections</h3><p>Suggest reliable references, clarify historical context, identify a possible duplicate or explain a correction to an existing record.</p></li>
            <li><h3>Local and place knowledge</h3><p>Share alternative names, language context and location information with references where available. Distinguish personal observations from published evidence.</p></li>
            <li><h3>Images and digital assets</h3><p>Prepare site-specific photographs, surveys or models with authorship, dates, source information and evidence of permission to publish.</p></li>
          </ul>
        </section>

        <section className="hb-project__section" aria-labelledby="contact-prepare">
          <h2 id="contact-prepare" className="hb-section-title">Prepare a useful contribution</h2>
          <ol className="hb-project__steps">
            <li><h3>Identify the place</h3><p>Include the site name, governorate and existing History in Cards page link if there is one. Add alternative spellings when they help establish identity.</p></li>
            <li><h3>Explain what you are proposing</h3><p>State the addition or correction clearly, why it matters and any uncertainty. For a research or institutional proposal, outline the scope and the material available.</p></li>
            <li><h3>Provide supporting references</h3><p>Prepare source titles, authors or institutions and URLs or publication details. Point to the passage that supports your statement rather than only naming a website.</p></li>
            <li><h3>Document media rights</h3><p>For images or models, record the creator, source, date, caption and license or explicit permission. Only offer material you have the right to share; a credit line alone does not establish that right.</p></li>
          </ol>
        </section>

        <section className="hb-project__section" aria-labelledby="contact-review">
          <h2 id="contact-review" className="hb-section-title">How contributions would be reviewed</h2>
          <div className="hb-project__prose">
            <p>Once a public contribution channel is available, proposed additions will need the same source, identity and editorial checks as other archive content. Images and digital assets also need a separate rights and relevance review. Sharing material will not guarantee publication.</p>
            <p>Please prepare public heritage information only. Avoid personal or private information, and do not seek access to restricted sites or disturb heritage to create a contribution.</p>
          </div>
          <div className="hb-project__actions">
            <SmartLink className="hb-btn hb-btn--ink" href="/methodology">Read our review standards</SmartLink>
            <SmartLink className="hb-link" href="/our-work">Explore our areas of work</SmartLink>
          </div>
        </section>
      </div>
    </main>
  );
}
