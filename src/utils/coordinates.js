/** True when a site record has usable map coordinates. */
export const hasPosition = (site) => Number.isFinite(site?.latitude) && Number.isFinite(site?.longitude);
