/**
 * Verified governorate boundary geometry for the archive map.
 *
 * STATUS: no verified, openly licensed dataset has been added yet, so this is `null`
 * and the Map page falls back to the coordinate plot. Do NOT draw boundaries by hand.
 *
 * To add real boundaries:
 *   1. Obtain a GeoJSON file from a reliable, openly licensed source (record its name, URL, licence).
 *   2. Run:  node scripts/geojson-to-svg.mjs <file.geojson> --name-property <PROPERTY> \
 *              --source "<dataset name>" --url "<dataset url>" --license "<licence>"
 *      It writes this file in the shape below.
 *   3. Document the source in Documentation.md.
 *
 * Expected shape (unattributed geometry is refused by utils/governorateGeometry.js):
 *   {
 *     viewBox: '0 0 1000 1200',
 *     attribution: { name: '...', url: '...', license: '...' },
 *     features: [{ key: 'nineveh', name: 'Nineveh', d: 'M0 0 L10 0 ... Z' }]
 *   }
 */
export const IRAQ_GOVERNORATE_GEOMETRY = null;
