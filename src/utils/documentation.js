/**
 * Summary of project-documented sites for the Home "Our Documentation" section.
 * Everything is derived from the normalized sites. Types come from the data
 * (`our_work_types`, documentation methods), plus "3D model" / "Video" only when the documented
 * site really has that asset.
 */
export function getDocumentationSummary(sites) {
  const documented = sites.filter((site) => site.hasOurWork);
  const counts = new Map(); // lower-case key -> { label, count }

  const add = (label, siteId, seen) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const entry = counts.get(key) ?? { label, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  };

  for (const site of documented) {
    const seen = new Set();
    site.ourWorkTypes.forEach((label) => add(label, site.id, seen));
    const labels = [...seen];
    if (site.hasModel && !labels.some((l) => l.startsWith('3d'))) add('3D model', site.id, seen);
    if (site.hasVideo && !labels.includes('video')) add('Video', site.id, seen);
  }

  const types = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { documented, types };
}
