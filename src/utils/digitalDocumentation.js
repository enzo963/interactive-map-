import catalog from '../data/digital-documentation.json';
import { getModelEmbed } from './media';

/**
 * 3D documentation for Site Details, from src/data/digital-documentation.json (see src/data/README.md).
 * Every resource is classified: `measured` (captured from the place itself) or `modeled` (built by
 * hand, including reconstructions). Resources are returned in the shape ModelViewer renders, measured
 * documentation first. Like videos, they enrich a card and never decide whether it is published.
 */
const RELATION_ORDER = { site: 0, part: 1, context: 2 };
const DOCUMENTATION_ORDER = { measured: 0, modeled: 1 };
export const MAX_DOCUMENTATION_PER_SITE = 8;

function normalize(resource, link, data) {
  const creator = data.creators?.[resource.creator];
  if (!creator || !data.creatorTypes?.includes(creator.type)) return null;
  if (!(resource.documentation in DOCUMENTATION_ORDER) || !data.methods?.[resource.method]) return null;
  if (!['stated', 'inferred'].includes(resource.methodEvidence)) return null;
  if (resource.provider !== 'sketchfab' || !/^[a-f0-9]{32}$/.test(resource.modelId ?? '')) return null;
  const url = `https://sketchfab.com/3d-models/${resource.modelId}`;
  if (getModelEmbed(url)?.type !== 'iframe') return null;
  return {
    url,
    title: String(resource.title ?? '').trim(),
    siteId: link.siteId,
    verified: true,
    kind: 'iframe',
    credit: creator.name,
    creatorType: creator.type,
    creatorUrl: creator.profileUrl ?? '',
    rightsHolder: resource.rightsHolder ?? '',
    license: resource.license ?? '',
    licenseUrl: resource.licenseUrl ?? '',
    year: /^\d{4}/.test(resource.published ?? '') ? resource.published.slice(0, 4) : '',
    documentation: resource.documentation,
    method: resource.method,
    methodLabel: data.methods[resource.method],
    methodEvidence: resource.methodEvidence,
    methodNote: resource.methodNote ?? '',
    depicts: resource.depicts ?? '',
    relation: link.relation,
    note: link.note ?? '',
  };
}

/** The classified 3D documentation of one card: measured first, then the site's own before its parts. */
export function documentationForSite(siteId, data = catalog) {
  const found = [];
  for (const resource of Array.isArray(data?.resources) ? data.resources : []) {
    const link = (resource.sites ?? []).find((item) => item?.siteId === siteId && item.relation in RELATION_ORDER);
    const normalized = link && normalize(resource, link, data);
    if (normalized?.title && !found.some((item) => item.url === normalized.url)) found.push(normalized);
  }
  return found
    .map((resource, index) => ({ resource, index }))
    .sort((a, b) => DOCUMENTATION_ORDER[a.resource.documentation] - DOCUMENTATION_ORDER[b.resource.documentation]
      || RELATION_ORDER[a.resource.relation] - RELATION_ORDER[b.resource.relation] || a.index - b.index)
    .slice(0, MAX_DOCUMENTATION_PER_SITE)
    .map(({ resource }) => resource);
}
