/**
 * Fits recorded coordinates into a plot. Equirectangular, scaled by cos(latitude)
 * so shapes are not stretched. No borders are drawn: only real points.
 * Returns percentages (0–100) for CSS positioning.
 */
const MIN_RATIO = 0.9;
const MAX_RATIO = 1.5;

export function buildMapFrame(sites, padding = 0.12) {
  const points = sites.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
  if (points.length === 0) return null;

  let minLat = Math.min(...points.map((s) => s.latitude));
  let maxLat = Math.max(...points.map((s) => s.latitude));
  let minLon = Math.min(...points.map((s) => s.longitude));
  let maxLon = Math.max(...points.map((s) => s.longitude));

  const widen = (min, max, minSpan) => {
    const span = max - min;
    if (span >= minSpan) return [min, max];
    const mid = (min + max) / 2;
    return [mid - minSpan / 2, mid + minSpan / 2];
  };
  [minLat, maxLat] = widen(minLat, maxLat, 1);
  [minLon, maxLon] = widen(minLon, maxLon, 1);

  const padLat = (maxLat - minLat) * padding;
  const padLon = (maxLon - minLon) * padding;
  minLat -= padLat; maxLat += padLat; minLon -= padLon; maxLon += padLon;

  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const ratio = ((maxLon - minLon) * k) / (maxLat - minLat);
  if (ratio < MIN_RATIO) {
    const extra = ((MIN_RATIO * (maxLat - minLat)) / k - (maxLon - minLon)) / 2;
    minLon -= extra; maxLon += extra;
  } else if (ratio > MAX_RATIO) {
    const extra = (((maxLon - minLon) * k) / MAX_RATIO - (maxLat - minLat)) / 2;
    minLat -= extra; maxLat += extra;
  }

  const finalRatio = ((maxLon - minLon) * k) / (maxLat - minLat);
  const x = (lon) => ((lon - minLon) / (maxLon - minLon)) * 100;
  const y = (lat) => ((maxLat - lat) / (maxLat - minLat)) * 100;

  const ticks = (min, max, project) => {
    const span = max - min;
    const step = span > 12 ? 5 : span > 6 ? 2 : 1;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push({ value: v, at: project(v) });
    return out;
  };

  return {
    ratio: Number(finalRatio.toFixed(3)),
    project: (site) => ({ x: x(site.longitude), y: y(site.latitude) }),
    latTicks: ticks(minLat, maxLat, y),
    lonTicks: ticks(minLon, maxLon, x),
  };
}
