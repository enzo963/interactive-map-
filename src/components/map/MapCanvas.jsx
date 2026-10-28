import { useEffect, useRef } from 'react';
import L from '../../lib/leaflet';
import { getGovernorateKey } from '../../data/governorates';
import { cardsLabel } from '../../utils/archiveStats';
import '../../styles/map-explorer.css';

const IRAQ_BOUNDS = [[29.0, 38.7], [37.4, 48.6]];
// Free OpenStreetMap tiles: no key, attribution required (https://operations.osmfoundation.org/policies/tiles/).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const LABEL_MAX_ZOOM = 9;

const hasPosition = (site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude);
const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pinIcon = (site, selected) =>
  L.divIcon({
    className: 'hb-pin-wrap',
    html: `<span class="hb-pin" data-tier="${site.cardType.tier}" data-selected="${selected}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const draftIcon = L.divIcon({ className: 'hb-pin-wrap', html: '<span class="hb-pin hb-pin--draft"></span>', iconSize: [28, 28], iconAnchor: [14, 14] });

const clusterIcon = (cluster) =>
  L.divIcon({
    className: 'hb-cluster-wrap',
    html: `<span class="hb-cluster">${cluster.getChildCount()}</span>`,
    iconSize: [38, 38],
  });

/**
 * Leaflet map of card positions on a free OpenStreetMap basemap.
 *  - one diamond pin per card, coloured by card type; nearby pins cluster when zoomed out
 *  - governorate labels show live card counts (computed from the data, never typed in)
 *  - `picking` turns map clicks into `onPick({ lat, lng })`; `draft` shows a draggable pin for that position
 *  - the view is fitted to ALL sites once, so filtering never makes the map jump
 */
export default function MapCanvas({ allSites, visibleSites, selectedSite, onSelect, picking = false, draft = null, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const markersRef = useRef(new Map());
  const draftRef = useRef(null);
  const handlers = useRef({ onSelect, onPick, picking });
  useEffect(() => { handlers.current = { onSelect, onPick, picking }; });

  // Create the map once.
  useEffect(() => {
    const map = L.map(containerRef.current, { minZoom: 5, maxZoom: 18, worldCopyJump: false, zoomSnap: 0.5 });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const clusters = L.markerClusterGroup({ iconCreateFunction: clusterIcon, showCoverageOnHover: false, maxClusterRadius: 45 }).addTo(map);
    const labels = L.layerGroup().addTo(map);
    layersRef.current = { clusters, labels };

    const positioned = allSites.filter(hasPosition);
    if (positioned.length > 1) map.fitBounds(L.latLngBounds(positioned.map((s) => [s.latitude, s.longitude])).pad(0.25), { maxZoom: 11 });
    else if (positioned.length === 1) map.setView([positioned[0].latitude, positioned[0].longitude], 9);
    else map.fitBounds(IRAQ_BOUNDS);

    const toggleLabels = () => containerRef.current?.toggleAttribute('data-labels-hidden', map.getZoom() > LABEL_MAX_ZOOM);
    map.on('zoomend', toggleLabels);
    toggleLabels();
    map.on('click', (event) => {
      if (handlers.current.picking) handlers.current.onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    mapRef.current = map;
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // The initial view is fitted once on purpose; later data changes must not move the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins + governorate count labels for the filtered cards.
  useEffect(() => {
    const { clusters, labels } = layersRef.current;
    clusters.clearLayers();
    labels.clearLayers();
    markersRef.current.clear();

    const groups = new Map();
    const pins = [];
    for (const site of visibleSites) {
      if (!hasPosition(site)) continue;
      const marker = L.marker([site.latitude, site.longitude], { icon: pinIcon(site, false), keyboard: false, title: site.name });
      marker.bindTooltip(
        `<strong>${escapeHtml(site.name)}</strong><br><span>${escapeHtml([site.cardType.shortLabel, site.siteType].filter(Boolean).join(' · '))}</span>`,
        { direction: 'top', offset: [0, -10], className: 'hb-map-tip' },
      );
      marker.on('click', () => { if (!handlers.current.picking) handlers.current.onSelect(site); });
      markersRef.current.set(site.id, marker);
      pins.push(marker);

      const key = getGovernorateKey(site.governorate) || 'unknown';
      const group = groups.get(key) ?? { name: site.governorate || 'Unknown', lat: 0, lng: 0, n: 0 };
      group.lat += site.latitude; group.lng += site.longitude; group.n += 1;
      groups.set(key, group);
    }
    clusters.addLayers(pins);

    groups.forEach((group) => {
      L.marker([group.lat / group.n, group.lng / group.n], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'hb-gov-wrap',
          html: `<span class="hb-gov"><span class="hb-gov__name">${escapeHtml(group.name)}</span><span class="hb-gov__count">${cardsLabel(group.n)}</span></span>`,
          iconSize: null,
        }),
      }).addTo(labels);
    });
  }, [visibleSites]);

  // Highlight the selected card and bring it into view.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const site = visibleSites.find((s) => s.id === id);
      if (site) marker.setIcon(pinIcon(site, selectedSite?.id === id));
      marker.setZIndexOffset(selectedSite?.id === id ? 1000 : 0);
    });
    const marker = selectedSite && markersRef.current.get(selectedSite.id);
    if (marker && !mapRef.current.getBounds().contains(marker.getLatLng())) {
      layersRef.current.clusters.zoomToShowLayer(marker);
    }
  }, [selectedSite, visibleSites]);

  // Draft pin for the place being added / moved.
  useEffect(() => {
    const map = mapRef.current;
    if (!draft) {
      draftRef.current?.remove();
      draftRef.current = null;
      return;
    }
    if (!draftRef.current) {
      draftRef.current = L.marker([draft.lat, draft.lng], { icon: draftIcon, draggable: true, zIndexOffset: 2000, keyboard: false }).addTo(map);
      draftRef.current.on('dragend', (event) => {
        const { lat, lng } = event.target.getLatLng();
        handlers.current.onPick?.({ lat, lng });
      });
    } else {
      draftRef.current.setLatLng([draft.lat, draft.lng]);
    }
    if (!map.getBounds().contains([draft.lat, draft.lng])) map.panTo([draft.lat, draft.lng]);
  }, [draft]);

  useEffect(() => () => draftRef.current?.remove(), []);

  return (
    <div className="hb-mapx">
      <div
        ref={containerRef}
        className="hb-mapx__leaflet"
        data-picking={picking}
        role="region"
        aria-label="Map of card positions. The list of cards beside the map offers the same information."
      />
      <p className="hb-map__caption">
        {picking ? 'Click the map to place the pin, then drag it to fine-tune.' : 'Pins are plotted from recorded coordinates. Colour shows the card type.'}
      </p>
    </div>
  );
}
