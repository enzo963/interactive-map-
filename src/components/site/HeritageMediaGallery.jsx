import { useState } from 'react';
import Gallery from './Gallery';
import MediaAttribution from './MediaAttribution';
import { EvidenceReferences } from './HeritageStory';
import { VideoPlayer } from './SiteSections';
import StatePanel from '../common/StatePanel';
import { MEDIA_TYPES } from '../../utils/heritageMedia';
import { mediaLicenseState } from '../../utils/mediaAttribution';
import { safeUrl } from '../../utils/urls';
import { t, tn } from '../../i18n';
import '../../styles/heritage-media.css';

export function MediaDetails({ resource, image = false }) {
  const type = MEDIA_TYPES.find((item) => item.id === resource.type);
  return <div className="hb-media__details">
    <p className="hb-media__type">{t(type?.label || 'Photograph')}</p>
    {resource.title && <p><strong>{resource.title}</strong></p>}
    {resource.dateLabel && <p>{t('Recorded date:')} {resource.dateLabel}</p>}
    {resource.type === 'archival-image' && !resource.dateLabel && <p>{t('Date not recorded')}</p>}
    {resource.description && <p>{resource.description}</p>}
    {resource.type === 'reconstruction' && <p>{t('Reconstruction render: an interpretation, not an archival photograph.')}</p>}
    {resource.type === 'panorama' && <p>{t('Panoramic image. Open the image viewer for a larger view.')}</p>}
    <MediaAttribution media={resource} image={image} />
    <EvidenceReferences sources={resource.sources} />
  </div>;
}

function ResourceEntry({ resource, site }) {
  const [opened, setOpened] = useState(false);
  return <article className="hb-media__resource">
    <MediaDetails resource={resource} />
    {resource.type === 'video' ? <>
      {opened ? <VideoPlayer url={resource.url} resource={resource} name={resource.title || site.name} />
        : <button type="button" className="hb-btn" onClick={() => setOpened(true)}>{t('Load video')}</button>}
      <a href={resource.url} target="_blank" rel="noopener noreferrer">{t('Open video resource')}<span className="sr-only"> ({t('opens in a new tab')})</span></a>
    </> : <a href="#model">{t('View at 3D model section')}</a>}
  </article>;
}

/** The existing image lightbox remains the image viewer; heavy resources are opt-in. */
export default function HeritageMediaGallery({ site, images = [] }) {
  const [selected, setSelected] = useState('all');
  const typed = site.heritageMedia || [];
  const typedImages = typed.filter((resource) => MEDIA_TYPES.find((type) => type.id === resource.type)?.isImage);
  const imageResources = [...typedImages, ...images.map((image) => ({ ...image, type: 'photograph' }))]
    .filter((image, index, all) => all.findIndex((other) => other.src === image.src) === index);
  const models = (site.modelResources || []).map((resource) => ({
    ...typed.find((item) => item.type === '3d' && item.url === resource.url), ...resource, type: '3d',
  }));
  const videos = typed.filter((resource) => resource.type === 'video');
  if (site.videoUrl && safeUrl(site.videoUrl, { allowRelative: true, httpsOnly: true })
    && mediaLicenseState(site.videoResource) !== 'restricted' && !videos.some((resource) => resource.url === site.videoUrl)) {
    videos.push({ ...site.videoResource, type: 'video', url: site.videoUrl, title: site.videoResource?.title || site.name });
  }
  const resources = [...videos, ...models];
  const all = [...imageResources, ...resources];
  const choices = MEDIA_TYPES.filter((type) => all.some((resource) => resource.type === type.id));
  const visibleImages = imageResources.filter((resource) => selected === 'all' || resource.type === selected);
  const visibleResources = resources.filter((resource) => selected === 'all' || resource.type === selected);
  if (!all.length) return <StatePanel kind="unavailable" title={t('Images unavailable')}
    description={t('No images are available for this site yet.')} headingLevel={3} compact />;
  return <div className="hb-media">
    {choices.length > 1 && <div className="hb-media__filters" role="group" aria-label={t('Filter site media by type')}>
      <button type="button" data-media-type="all" aria-pressed={selected === 'all'} onClick={() => setSelected('all')}>{t('All media')} ({all.length})</button>
      {choices.map((type) => <button type="button" data-media-type={type.id} key={type.id} aria-pressed={selected === type.id} onClick={() => setSelected(type.id)}>
        {t(type.label)} ({all.filter((resource) => resource.type === type.id).length})
      </button>)}
    </div>}
    <p role="status">{tn('{n} media item', '{n} media items', visibleImages.length + visibleResources.length)}</p>
    {visibleImages.length > 0 && <Gallery key={`${site.id}:${selected}`} images={visibleImages} renderAttribution={(image) => <MediaDetails resource={image} image />} />}
    {visibleResources.length > 0 && <div className="hb-media__resources">{visibleResources.map((resource) => <ResourceEntry key={`${resource.type}:${resource.url}`} resource={resource} site={site} />)}</div>}
  </div>;
}
