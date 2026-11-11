import PageHeader from '../components/common/PageHeader';
import SmartLink from '../components/common/SmartLink';
import useDocumentTitle from '../hooks/useDocumentTitle';
import '../styles/pages.css';
import '../styles/project-pages.css';
import { t } from '../i18n';

export default function Contact() {
  useDocumentTitle('Contact & Contribution — History in Cards');
  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader eyebrow={t('Take part in the archive')} title={t('Contact & Contribution')}
        lede={t('Good heritage records grow through shared knowledge. Learn what you can contribute and how to prepare information for a future review.')} />
      <div className="hb-container hb-project">
        <aside className="hb-project__callout" aria-labelledby="contact-availability">
          <p className="hb-eyebrow">{t('Contact channels forthcoming')}</p>
          <h2 id="contact-availability">{t('Preparing to welcome contributions')}</h2>
          <p>{t('Official contact details will be added later. We do not currently accept submissions through this page. You can use the guidance below to prepare material for when a public contact channel becomes available.')}</p>
        </aside>

        <section className="hb-project__section" aria-labelledby="contact-who">
          <h2 id="contact-who" className="hb-section-title">{t('Who can contribute?')}</h2>
          <p className="hb-project__text">{t('Researchers, students, heritage professionals, institutions, photographers and visitors all bring useful perspectives. A contribution can be a carefully referenced correction, an alternative name or a documented photograph; it does not need to be a large research project.')}</p>
          <ul className="hb-project__cards">
            <li><h3>{t('Research and corrections')}</h3><p>{t('Suggest reliable references, clarify historical context, identify a possible duplicate or explain a correction to an existing record.')}</p></li>
            <li><h3>{t('Local and place knowledge')}</h3><p>{t('Share alternative names, language context and location information with references where available. Distinguish personal observations from published evidence.')}</p></li>
            <li><h3>{t('Images and digital assets')}</h3><p>{t('Prepare site-specific photographs, surveys or models with authorship, dates, source information and evidence of permission to publish.')}</p></li>
          </ul>
        </section>

        <section className="hb-project__section" aria-labelledby="contact-prepare">
          <h2 id="contact-prepare" className="hb-section-title">{t('Prepare a useful contribution')}</h2>
          <ol className="hb-project__steps">
            <li><h3>{t('Identify the place')}</h3><p>{t('Include the site name, governorate and existing History in Cards page link if there is one. Add alternative spellings when they help establish identity.')}</p></li>
            <li><h3>{t('Explain what you are proposing')}</h3><p>{t('State the addition or correction clearly, why it matters and any uncertainty. For a research or institutional proposal, outline the scope and the material available.')}</p></li>
            <li><h3>{t('Provide supporting references')}</h3><p>{t('Prepare source titles, authors or institutions and URLs or publication details. Point to the passage that supports your statement rather than only naming a website.')}</p></li>
            <li><h3>{t('Document media rights')}</h3><p>{t('For images or models, record the creator, source, date, caption and license or explicit permission. Only offer material you have the right to share; a credit line alone does not establish that right.')}</p></li>
          </ol>
        </section>

        <section className="hb-project__section" aria-labelledby="contact-review">
          <h2 id="contact-review" className="hb-section-title">{t('How contributions would be reviewed')}</h2>
          <div className="hb-project__prose">
            <p>{t('Once a public contribution channel is available, proposed additions will need the same source, identity and editorial checks as other archive content. Images and digital assets also need a separate rights and relevance review. Sharing material will not guarantee publication.')}</p>
            <p>{t('Please prepare public heritage information only. Avoid personal or private information, and do not seek access to restricted sites or disturb heritage to create a contribution.')}</p>
          </div>
          <div className="hb-project__actions">
            <SmartLink className="hb-btn hb-btn--ink" href="/methodology">{t('Read our review standards')}</SmartLink>
            <SmartLink className="hb-link" href="/our-work">{t('Explore our areas of work')}</SmartLink>
          </div>
        </section>
      </div>
    </main>
  );
}
