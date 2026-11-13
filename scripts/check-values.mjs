/**
 * Controlled values in src/data/sites.json: every record's governorate and category must be stored in
 * its canonical spelling (src/data/governorates.js, src/data/categories.js), so no variant such as
 * "Ninewa" or "Mosque and Minaret" forms its own filter option.
 *   npm run check:values               report variants and unknown values; exit 1 if any
 *   npm run check:values -- --write    store the canonical value for every recognised variant
 * Unknown values are never guessed: add them to the alias tables or correct the record by hand.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { normalizeGovernorate } from '../src/data/governorates.js';
import { normalizeCategory } from '../src/data/categories.js';

const file = new URL('../src/data/sites.json', import.meta.url);
const records = JSON.parse(readFileSync(file, 'utf8'));
const FIELDS = [['governorate', normalizeGovernorate], ['category', normalizeCategory]];

const variants = [];
const unknown = [];
for (const record of records) {
  for (const [field, normalize] of FIELDS) {
    const value = record[field];
    const canonical = normalize(value);
    if (canonical === null) unknown.push({ id: record.id, field, value });
    else if (canonical !== value) variants.push({ record, field, value, canonical });
  }
}

const write = process.argv.includes('--write');
for (const { record, field, value, canonical } of variants) {
  console.log(`${write ? 'fixed' : 'variant'}  ${record.id}  ${field}: "${value}" → "${canonical}"`);
  if (write) record[field] = canonical;
}
for (const { id, field, value } of unknown) console.log(`unknown  ${id}  ${field}: "${value ?? ''}"`);
if (write && variants.length) writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`);

console.log(`${records.length} records: ${variants.length} variant value(s)${write ? ' fixed' : ''}, ${unknown.length} unknown.`);
if (unknown.length || (variants.length && !write)) process.exitCode = 1;
