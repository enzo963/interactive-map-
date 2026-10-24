import { useMemo } from 'react';
import SmartLink from '../common/SmartLink';
import { buildMapFrame } from '../../utils/mapFrame';
import '../../styles/home-sections.css';
import '../../styles/site-details.css';

const fmt = (n) => n.toFixed(4);

/**
 * Where the site is, relative to the other cards in its governorate.
 * Plots recorded coordinates only (no basemap). Returns null without coordinates.
 */
export default function SiteLocation({ site, neighbours }) {
  const frame = useMemo(() => buildMapFrame([site, ...neighbours], 0.3), [site, neighbours]);
  if (!frame || !Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) return null;

  const osm = `https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}#map=13/${site.latitude}/${site.longitude}`;
  const withCoords = neighbours.filter((n) => Number.isFinite(n.latitude) && Number.isFinite(n.longitude));

  return (
    <div className="hb-location">
      <figure className="hb-location__figure">
        <div className="hb-map__plot" aria-hidden="true" style={{ '--ratio': frame.ratio }}>
          {frame.latTicks.map((t) => (
            <span className="hb-map__line hb-map__line--lat" style={{ '--at': `${t.at}%` }} key={`la${t.value}`}><span>{t.value}°N</span></span>
          ))}
          {frame.lonTicks.map((t) => (
            <span className="hb-map__line hb-map__line--lon" style={{ '--at': `${t.at}%` }} key={`lo${t.value}`}><span>{t.value}°E</span></span>
          ))}
          {withCoords.map((other) => {
            const { x, y } = frame.project(other);
            return <span className="hb-map__dot" style={{ '--x': `${x}%`, '--y': `${y}%` }} key={other.id} />;
          })}
          {(() => {
            const { x, y } = frame.project(site);
            return <span className="hb-map__dot" data-selected="true" style={{ '--x': `${x}%`, '--y': `${y}%` }} />;
          })()}
        </div>
        <figcaption className="hb-map__caption">
          Recorded position, shown with {withCoords.length} other {withCoords.length === 1 ? 'card' : 'cards'} from the same governorate. Boundaries are not shown.
        </figcaption>
      </figure>

      <div className="hb-location__text">
        <dl className="hb-location__coords">
          <div><dt>Latitude</dt><dd>{fmt(site.latitude)}</dd></div>
          <div><dt>Longitude</dt><dd>{fmt(site.longitude)}</dd></div>
        </dl>
        <p><SmartLink className="hb-link" href={`/map?site=${site.slug}`}>View on the archive map</SmartLink></p>
        <p><a className="hb-link" href={osm} target="_blank" rel="noopener noreferrer">Open in OpenStreetMap<span className="sr-only"> (opens in a new tab)</span></a></p>
      </div>
    </div>
  );
}
