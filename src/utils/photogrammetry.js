import { isApprovedSite, getModelLibrary } from './modelResources';
import { approvedCover } from './coverApproval';
import { attributionFields, mediaLicenseState } from './mediaAttribution';
import { safeUrl } from './urls';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const reviewed = (value) => ['verified', 'approved'].includes(value);
const statuses = (value) => [value.verificationStatus, value.verification_status].filter(Boolean);
const references = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

/** Reviewed project records link resources; they never approve the linked resources. */
export function normalizePhotogrammetryProjects(raw, { images = [], modelResources = [] } = {}) {
  if (!isApprovedSite(raw) || !Array.isArray(raw.photogrammetry_projects)) return [];
  const siteId = String(raw.id);
  const eligibleModels = getModelLibrary([{ ...raw, id: siteId, modelResources }]).map((entry) => entry.resource);
  const seen = new Set();
  return raw.photogrammetry_projects.flatMap((project) => {
    if (!project || typeof project !== 'object' || project.verified === false || !text(project.id) || !text(project.title)
      || String(project.siteId) !== siteId || !statuses(project).length || !statuses(project).every(reviewed) || seen.has(text(project.id))) return [];
    seen.add(text(project.id));
    const modelUrls = references(project.modelUrls);
    const photographUrls = references(project.photographUrls);
    const documents = (Array.isArray(project.documentation) ? project.documentation : []).flatMap((item) => {
      if (!item || typeof item !== 'object' || item.verified === false || !statuses(item).length || !statuses(item).every(reviewed)
        || (item.siteId && String(item.siteId) !== siteId) || !text(item.title) || mediaLicenseState(item) === 'restricted') return [];
      const url = safeUrl(item.url, { allowRelative: true, httpsOnly: true });
      return url ? [{ ...attributionFields(item), title: text(item.title), url, credit: text(item.credit), license: text(item.license), siteId }] : [];
    });
    const reconstruction = project.reconstruction && typeof project.reconstruction === 'object' ? {
      description: text(project.reconstruction.description),
      evidence: text(project.reconstruction.evidence),
      uncertainties: text(project.reconstruction.uncertainties),
    } : null;
    return [{
      id: text(project.id), title: text(project.title), siteId,
      verificationStatus: statuses(project)[0], ourWork: project.our_work === true,
      status: ['planned', 'in-progress', 'completed', 'archived'].includes(project.status) ? project.status : '',
      creator: text(project.creator), organization: text(project.organization), method: text(project.method),
      year: Number.isInteger(project.year) && project.year >= 1 && project.year <= 9999 ? project.year : null,
      description: text(project.description),
      models: eligibleModels.filter((model) => modelUrls.includes(model.url)),
      images: images.filter((image) => photographUrls.includes(image.src) && image.siteId === siteId
        && mediaLicenseState(image) === 'verified' && approvedCover({ id: siteId, coverImage: image })),
      documents, reconstruction,
    }];
  });
}
