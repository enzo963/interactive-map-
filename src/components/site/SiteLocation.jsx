import { useMemo } from 'react';
import SmartLink from '../common/SmartLink';
import { hasVerifiedPosition } from '../../utils/mapPosition';
import MapCanvas from '../map/MapCanvas';
import { useNavigate } from '../../router/RouterContext';
import '../../styles/home-sections.css';
import '../../styles/site-details.css';
import { t, tn } from '../../i18n';

const fmt = (n) => n.toFixed(4);

/**
 * Where the site is, relative to the other cards in its governorate, on the shared Leaflet map.
 * Returns null without coordinates.
 */
export default function SiteLocation({ site, neighbours }) {
  const navigate = useNavigate();
  const mapSites = useMemo(() => [site, ...neighbours], [site, neighbours]);
  if (!hasVerifiedPosition(site)) return null;

  const osm = `https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}#map=13/${site.latitude}/${site.longitude}`;
  const withCoords = neighbours.filter(hasVerifiedPosition);

  return (
    <div className="hb-location">
      <figure className="hb-location__figure">
        <MapCanvas
          allSites={mapSites}
          visibleSites={mapSites}
          selectedSite={site}
          onSelect={(other) => { if (other.id !== site.id) navigate(other.href); }}
          size="compact"
          caption={tn('Verified position, shown with {n} other card from the same governorate. Select a pin to open that card.', 'Verified position, shown with {n} other cards from the same governorate. Select a pin to open that card.', withCoords.length)}
        />
      </figure>

      <div className="hb-location__text">
        <dl className="hb-location__coords">
          <div><dt>{t('Latitude')}</dt><dd>{fmt(site.latitude)}</dd></div>
          <div><dt>{t('Longitude')}</dt><dd>{fmt(site.longitude)}</dd></div>
        </dl>
        <p><SmartLink className="hb-link" href={`/map?site=${site.slug}`}>{t('View on the archive map')}</SmartLink></p>
        <p><a className="hb-link" href={osm} target="_blank" rel="noopener noreferrer">{t('Open in OpenStreetMap')}<span className="sr-only"> ({t('opens in a new tab')})</span></a></p>
      </div>
    </div>
  );
}
