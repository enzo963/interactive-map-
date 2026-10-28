import { useMemo } from 'react';
import SmartLink from '../common/SmartLink';
import MapCanvas from '../map/MapCanvas';
import { useNavigate } from '../../router/RouterContext';
import '../../styles/home-sections.css';
import '../../styles/site-details.css';

const fmt = (n) => n.toFixed(4);

/**
 * Where the site is, relative to the other cards in its governorate, on the shared Leaflet map.
 * Returns null without coordinates.
 */
export default function SiteLocation({ site, neighbours }) {
  const navigate = useNavigate();
  const mapSites = useMemo(() => [site, ...neighbours], [site, neighbours]);
  if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) return null;

  const osm = `https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}#map=13/${site.latitude}/${site.longitude}`;
  const withCoords = neighbours.filter((n) => Number.isFinite(n.latitude) && Number.isFinite(n.longitude));

  return (
    <div className="hb-location">
      <figure className="hb-location__figure">
        <MapCanvas
          allSites={mapSites}
          visibleSites={mapSites}
          selectedSite={site}
          onSelect={(other) => { if (other.id !== site.id) navigate(other.href); }}
          size="compact"
          caption={`Recorded position, shown with ${withCoords.length} other ${withCoords.length === 1 ? 'card' : 'cards'} from the same governorate. Select a pin to open that card.`}
        />
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
