/**
 * Whether a card has a safe map position. Only a verified position is drawn as a pin; a card without
 * one is still published and listed, and says why it is not on the map.
 *
 *   verified     latitude/longitude of the site itself (`coordinates_precision: "site"`) with a recorded
 *                source, checked by tools/content-pipeline/verify_coordinates.py
 *   approximate  a point known only to the town, neighbourhood or area (precision "settlement" or
 *                "approximate"), or one without a source or precision: not drawn as a pin
 *   none         no position recorded yet
 *
 * Accepts a raw sites.json record or an adapted site.
 */
export const MAP_POSITION_LABELS = {
  verified: 'Verified position',
  approximate: 'Approximate area only',
  none: 'No map position yet',
};

export const MAP_POSITION_NOTES = {
  verified: 'The pin marks the site itself, from a checked source.',
  approximate: 'The recorded point is the town or area, not the site itself, so it is not shown as a pin.',
  none: 'No reliable position has been recorded yet, so the card is not shown on the map.',
};

export function mapPosition(record) {
  if (!Number.isFinite(record?.latitude) || !Number.isFinite(record?.longitude)) return 'none';
  const precision = record.coordinatesPrecision ?? record.coordinates_precision;
  const source = record.coordinatesSource ?? record.coordinates_source;
  return precision === 'site' && typeof source === 'string' && source.trim() ? 'verified' : 'approximate';
}

export const hasVerifiedPosition = (record) => mapPosition(record) === 'verified';
