import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const sitesFile = fileURLToPath(new URL('../src/data/sites.json', import.meta.url)).replaceAll('\\', '/');

const aggregateId = '\0heritage-visible-sites';
const partitionPrefix = '\0heritage-sites/';
const partitionBudget = 300 * 1024;

/** Apply the public card contract before Vite's JSON loader emits client assets. */
export default function publishedSites() {
  let root;
  let visibleArchives;
  let approvedOnly;
  let aggregate;
  const partitions = new Map();
  return {
    name: 'published-heritage-records',
    apply: 'build', enforce: 'pre',
    configResolved(config) {
      root = config.root;
      // Server-side release switch: never exposed through import.meta.env.
      approvedOnly = process.env.HB_RELEASE_APPROVED_ONLY === '1';
    },
    resolveId(source, importer) {
      if (source === aggregateId || source.startsWith(partitionPrefix)) return source;
      if (!importer || !source.startsWith('.')) return null;
      if (resolve(dirname(importer), source).replaceAll('\\', '/') === sitesFile) return aggregateId;
      return null;
    },
    load(id) {
      if (id === aggregateId) return aggregate;
      if (partitions.has(id)) return `export default ${JSON.stringify(partitions.get(id))};`;
      return null;
    },
    async buildStart() {
      // A config-free SSR loader resolves the existing browser modules without
      // recursively installing this build plugin or introducing Node code there.
      const server = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
      try {
        const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
        visibleArchives = new Map(getAllSites().filter((site) => !approvedOnly || site.status === 'approved')
          .map((site) => [site.id, site.archiveNo]));
      } finally {
        await server.close();
      }
      const records = JSON.parse(await readFile(sitesFile, 'utf8'));
      const visible = records.filter((record) => visibleArchives.has(String(record.id)))
        .map((record) => ({ ...record, archive_no: visibleArchives.get(String(record.id)) }));
      const groups = new Map();
      const references = [];
      partitions.clear();
      for (const record of visible) {
        const governorate = String(record.governorate).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const size = Buffer.byteLength(JSON.stringify(record)) + 1;
        if (size > partitionBudget) throw new Error(`Card ${record.id} exceeds the data partition budget.`);
        let group = groups.get(governorate);
        if (!group || group.size + size > partitionBudget) {
          const part = (group?.part ?? -1) + 1;
          group = { id: `${partitionPrefix}${governorate}-${part}`, part, size: 2, records: [] };
          groups.set(governorate, group);
          partitions.set(group.id, group.records);
        }
        references.push({ id: group.id, index: group.records.length });
        group.records.push(record);
        group.size += size;
      }
      const names = new Map([...partitions.keys()].map((id, index) => [id, `g${index}`]));
      // Static imports keep the synchronous service contract. Preserve original
      // source order even when adjacent records belong to different governorates.
      aggregate = [...names].map(([id, name]) => `import ${name} from ${JSON.stringify(id)};`).join('\n')
        + `\nexport default [${references.map(({ id, index }) => `${names.get(id)}[${index}]`).join(',')}];`;
    },
    transform(code, id) {
      if (id.split('?')[0].replaceAll('\\', '/') !== sitesFile) return null;
      const records = JSON.parse(code);
      if (!Array.isArray(records)) throw new Error('Heritage records must be an array.');
      if (!visibleArchives) throw new Error('Public card contract was not loaded.');
      // Preserve provisional archive numbers derived from the complete source,
      // including records omitted from the client bundle.
      const visible = records.filter((record) => visibleArchives.has(String(record.id)))
        .map((record) => ({ ...record, archive_no: visibleArchives.get(String(record.id)) }));
      return { code: JSON.stringify(visible), map: null };
    },
  };
}
