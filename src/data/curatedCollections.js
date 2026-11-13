import { normalizeSearchText } from '../utils/search';
import { getSiteHistoryEras } from '../utils/history';
import { getHeritageCategories } from '../utils/heritageCategories';
import { isApprovedSite, hasVerifiedModel } from '../utils/modelResources';
import { isDisappearedSite } from '../utils/heritageExperience';

// These reviewed Mosul records have no structured city field in the current export.
const mosulRecords = new Set(['site-nineveh-al-nouri', 'site-nineveh-dominican-church']);
const siteType = (site) => normalizeSearchText(site.siteType);

export const CURATED_COLLECTIONS = [
  { id: 'ancient-assyria', title: 'Ancient Assyria', blurb: 'Explore approved sites with recorded Assyrian historical associations, including places with more than one period.', back: 'geometric',
    rule: (site) => getSiteHistoryEras(site).some((era) => era.id === 'assyrian') },
  { id: 'mosul-religious-heritage', title: 'Mosul Religious Heritage', blurb: 'Explore reviewed mosques, churches and other religious places recorded in Mosul.', back: 'arches',
    rule: (site) => (normalizeSearchText(site.city) === 'mosul' || mosulRecords.has(site.id)) && getHeritageCategories(site).includes('religious') },
  { id: 'unesco-iraq', title: 'UNESCO Iraq', blurb: 'Explore the inscribed World Heritage properties represented in the approved Iraq archive.', back: 'formal',
    rule: (site) => site.isUnesco === true },
  { id: 'lost-heritage', title: 'Lost Heritage', blurb: 'Explore sites with reviewed evidence of loss, destruction or severe damage. Each record explains its recorded condition.', back: 'fragment',
    rule: isDisappearedSite },
  { id: 'citadels', title: 'Citadels', blurb: 'Explore fortified places recorded as citadels in the archive.', back: 'citadel',
    rule: (site) => /\bcitadel\b/.test(siteType(site)) },
  { id: 'churches', title: 'Churches', blurb: 'Explore records for churches, cathedrals and chapels.', back: 'arches',
    rule: (site) => /\b(church|cathedral|chapel)\b/.test(siteType(site)) },
  { id: 'mosques', title: 'Mosques', blurb: 'Explore places recorded as mosques, including entries that document an associated minaret.', back: 'arches',
    rule: (site) => /\bmosque\b/.test(siteType(site)) },
  { id: 'archaeological-cities', title: 'Archaeological Cities', blurb: 'Explore places recorded as archaeological cities and follow the references for each record.', back: 'geometric',
    rule: (site) => /\barchaeological city\b/.test(siteType(site)) },
  { id: 'digital-heritage', title: 'Digital Heritage', blurb: 'Explore sites with verified models, reviewed media, image comparisons or documented photogrammetry resources.', back: 'wireframe',
    rule: (site) => hasVerifiedModel(site) || site.heritageMedia?.length > 0 || site.comparisons?.length > 0 ||
      site.photogrammetryProjects?.some((project) => project.status !== 'planned' && (project.images.length || project.models.length || project.documents.length)) },
];

export function getCuratedCollection(sites, id) {
  const definition = CURATED_COLLECTIONS.find((entry) => entry.id === id);
  if (!definition) return null;
  const seen = new Set();
  const members = sites.filter((site) => {
    if (seen.has(site.id) || !isApprovedSite(site) || !definition.rule(site)) return false;
    seen.add(site.id);
    return true;
  });
  return { ...definition, href: `/collections/${id}`, sites: members, count: members.length };
}

export const getCuratedCollections = (sites) => CURATED_COLLECTIONS.map(({ id }) => getCuratedCollection(sites, id));
