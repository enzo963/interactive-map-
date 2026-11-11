/** Prints the IDs of the visible (published) cards as JSON, using the site's own card contract.
 *  Used by tools/content-pipeline/image_queue.py so the queue counts exactly the cards the site shows. */
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' });
const { isVisibleCard } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
await server.close();
const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
process.stdout.write(JSON.stringify(records.filter((record) => isVisibleCard(record)).map((record) => record.id)));
