import SmartLink from '../common/SmartLink';
import Gallery from './Gallery';
import MediaAttribution from './MediaAttribution';
import { t } from '../../i18n';
import '../../styles/model-library.css';

export default function PhotogrammetryProjects({ projects }) {
  return <div className="hb-photogrammetry">
    {projects.map((project) => <article className="hb-photogrammetry__project" key={project.id}>
      <h3>{project.title}</h3>
      {project.description && <p>{project.description}</p>}
      <dl className="hb-photogrammetry__facts">
        {[[t('Creator'), project.creator], [t('Organization'), project.organization], [t('Creation method'), project.method],
          [t('Year'), project.year], [t('Project status'), project.status ? t(project.status) : ''],
          [t('Verification status'), project.verificationStatus === 'approved' ? t('Approved') : t('Verified')]]
          .map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || t('Not recorded')}</dd></div>)}
      </dl>
      <h4>{t('Verified project models')}</h4>
      {project.models.length ? <ul>{project.models.map((model) => <li key={model.url}>
        <SmartLink href="#model">{model.title}</SmartLink>
      </li>)}</ul> : <p>{t('No verified model is linked to this project yet.')}</p>}
      {project.images.length > 0 && <><h4>{t('Project images')}</h4><Gallery images={project.images} renderAttribution={(image) => <MediaAttribution media={image} image />} /></>}
      <h4>{t('Project documentation')}</h4>
      {project.documents.length ? <ul>{project.documents.map((document) => <li key={document.url}>
        <a href={document.url} target="_blank" rel="noopener noreferrer">{document.title}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
        <MediaAttribution media={document} />
      </li>)}</ul> : <p>{t('No reviewed documentation is linked to this project yet.')}</p>}
      {project.reconstruction && Object.values(project.reconstruction).some(Boolean) && <aside className="hb-photogrammetry__interpretation">
        <h4>{t('Reconstruction and interpretation')}</h4>
        <p>{t('A reconstruction is an interpretation. Review its evidence and recorded uncertainties.')}</p>
        {project.reconstruction.description && <p>{project.reconstruction.description}</p>}
        <dl><dt>{t('Supporting evidence')}</dt><dd>{project.reconstruction.evidence || t('Not recorded')}</dd>
          <dt>{t('Uncertainties')}</dt><dd>{project.reconstruction.uncertainties || t('Not recorded')}</dd></dl>
      </aside>}
    </article>)}
  </div>;
}
