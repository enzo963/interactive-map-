import { useEffect, useRef } from 'react';
import L from '../../lib/leaflet';
import { getGovernorateKey } from '../../data/governorates';
import { GOVERNORATE_CENTRES } from '../../data/geo/governorateCentres';
import { cardsLabel } from '../../utils/archiveStats';
import '../../styles/map-explorer.css';
import { t } from '../../i18n';
import { clusterRadius } from '../../utils/mapLayers';

const IRAQ_BOUNDS = [[29.0, 38.7], [37.4, 48.6]];
// Free OpenStreetMap tiles: no key, attribution required (https://operations.osmfoundation.org/policies/tiles/).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const LABEL_MAX_ZOOM = 9;
const REGION_ZOOM = 8;

const hasPosition = (site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude);
const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pinIcon = (site, selected, historical = false) =>
  L.divIcon({
    className: 'hb-pin-wrap',
    html: `<span class="hb-pin" data-tier="${site.cardType.tier}" data-selected="${selected}" data-history="${historical}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const draftIcon = L.divIcon({ className: 'hb-pin-wrap', html: '<span class="hb-pin hb-pin--draft"></span>', iconSize: [28, 28], iconAnchor: [14, 14] });

const clusterIcon = (cluster) => {
  cluster.options.title = t('{n} nearby sites. Activate to zoom or separate overlapping markers.', { n: cluster.getChildCount() });
  return L.divIcon({
    className: 'hb-cluster-wrap',
    html: `<span class="hb-cluster" aria-hidden="true">${cluster.getChildCount()}</span>`,
    iconSize: [38, 38],
  });
};
const createPinGroup = (clustered) => clustered ? L.markerClusterGroup({
  iconCreateFunction: clusterIcon, showCoverageOnHover: false, maxClusterRadius: clusterRadius,
  spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true, removeOutsideVisibleBounds: true,
  animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
}) : L.layerGroup();

/** One label per governorate with cards: at its capital (data/geo/governorateCentres.js), else above its pins. */
function governorateGroups(sites) {
  const groups = new Map();
  for (const site of sites) {
    const key = getGovernorateKey(site.governorate);
    if (!key) continue;
    const group = groups.get(key) ?? { key, name: site.governorate, count: 0, north: -90, lng: 0, placed: 0 };
    group.count += 1;
    if (hasPosition(site)) {
      group.north = Math.max(group.north, site.latitude);
      group.lng += site.longitude;
      group.placed += 1;
    }
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const at = GOVERNORATE_CENTRES[group.key] ?? (group.placed > 0 ? [group.north, group.lng / group.placed] : null);
      return at ? { ...group, at } : null;
    })
    .filter(Boolean);
}

/** The whole archive: every positioned card plus the capital of every governorate that has cards. */
function archiveBounds(sites) {
  const points = sites.filter(hasPosition).map((s) => [s.latitude, s.longitude]);
  governorateGroups(sites).forEach((group) => points.push(group.at));
  return points.length > 1 ? L.latLngBounds(points).pad(0.2) : L.latLngBounds(IRAQ_BOUNDS);
}

/**
 * Leaflet map of card positions on a free OpenStreetMap basemap.
 *  - one diamond pin per card with coordinates, coloured by card type; nearby pins cluster when zoomed out
 *  - governorate labels show live card counts (from the data, never typed in) and select the governorate
 *  - `focusKey` (a governorate key) moves the map to that governorate; null returns to the whole archive
 *  - `picking` turns map clicks into `onPick({ lat, lng })`; `draft` shows a draggable pin for that position
 *  - `size="compact"` is the shorter map used on the home page and site pages; `caption` replaces the default note
 * The governorate buttons and result list beside the map are the keyboard and screen-reader route.
 */
export default function MapCanvas({
  allSites,
  visibleSites,
  selectedSite,
  focusKey = null,
  onSelect,
  onSelectRegion,
  onPreviewRegion,
  picking = false,
  draft = null,
  onPick,
  size = 'full',
  caption,
  clustered = true,
  historical = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const markersRef = useRef(new Map());
  const draftRef = useRef(null);
  const homeRef = useRef(null);
  const viewRef = useRef(null); // re-applies the current target view (archive or governorate) without animation
  // The governorate the map last moved to. Reset whenever a map is created, so a governorate already
  // in the URL is shown on first load (and again after React's development double-mount).
  const focusRef = useRef(null);
  const handlers = useRef({ onSelect, onPick, picking, onSelectRegion, onPreviewRegion });
  useEffect(() => { handlers.current = { onSelect, onPick, picking, onSelectRegion, onPreviewRegion }; });

  // Create the map once.
  useEffect(() => {
    const map = L.map(containerRef.current, { minZoom: 5, maxZoom: 18, zoomSnap: 0.5 });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const clusters = createPinGroup(clustered).addTo(map);
    const labels = L.layerGroup().addTo(map);
    layersRef.current = { clusters, labels, clustered };

    focusRef.current = null;
    homeRef.current = archiveBounds(allSites);
    viewRef.current = () => map.fitBounds(homeRef.current, { maxZoom: 11, animate: false });
    viewRef.current();

    const toggleLabels = () => containerRef.current?.toggleAttribute('data-labels-hidden', map.getZoom() > LABEL_MAX_ZOOM);
    map.on('zoomend', toggleLabels);
    toggleLabels();
    map.on('click', (event) => {
      if (handlers.current.picking) handlers.current.onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    // The container can still be 0×0 when the route mounts; fit again once it has a real size,
    // unless the visitor has already moved the map. jsdom (tests) has no ResizeObserver.
    let touched = false;
    const markTouched = () => { touched = true; };
    containerRef.current.addEventListener('pointerdown', markTouched, { once: true });
    containerRef.current.addEventListener('wheel', markTouched, { once: true, passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      map.invalidateSize();
      if (!touched && containerRef.current?.clientHeight) viewRef.current();
    });
    resize?.observe(containerRef.current);
    mapRef.current = map;
    return () => {
      resize?.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // The initial view is fitted once on purpose; later data changes must not move the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins + governorate count labels for the filtered cards.
  useEffect(() => {
    let { clusters } = layersRef.current;
    const { labels } = layersRef.current;
    if (layersRef.current.clustered !== clustered) {
      clusters.clearLayers();
      mapRef.current.removeLayer(clusters);
      clusters = createPinGroup(clustered).addTo(mapRef.current);
      layersRef.current.clusters = clusters;
      layersRef.current.clustered = clustered;
    }
    clusters.clearLayers();
    labels.clearLayers();
    markersRef.current.clear();

    const pins = [];
    for (const site of visibleSites) {
      if (!hasPosition(site)) continue;
      // keyboard: true makes each pin a focusable role="button" (Enter selects); the label names the card.
      const marker = L.marker([site.latitude, site.longitude], { icon: pinIcon(site, false, historical), keyboard: true });
      const label = `${site.name}, ${[t(site.cardType.shortLabel), t(site.governorate), historical && t(site.period || site.civilization)].filter(Boolean).join(', ')}`;
      marker.on('add', () => marker.getElement()?.setAttribute('aria-label', label));
      marker.bindTooltip(
        `<strong>${escapeHtml(site.name)}</strong><br><span>${escapeHtml([t(site.cardType.shortLabel), t(site.siteType), historical && t(site.period || site.civilization)].filter(Boolean).join(' · '))}</span>`,
        { direction: 'top', offset: [0, -10], className: 'hb-map-tip' },
      );
      marker.on('click', () => { if (!handlers.current.picking) handlers.current.onSelect?.(site); });
      marker.on('keydown', ({ originalEvent: event }) => {
        if ((event.key !== 'Enter' && event.key !== ' ') || handlers.current.picking) return;
        event.preventDefault();
        handlers.current.onSelect?.(site);
      });
      markersRef.current.set(site.id, marker);
      pins.push(marker);
    }
    if (clustered) clusters.addLayers(pins);
    else pins.forEach((marker) => clusters.addLayer(marker));

    const selectable = Boolean(handlers.current.onSelectRegion);
    governorateGroups(visibleSites).forEach((group) => {
      const label = L.marker(group.at, {
        interactive: selectable,
        keyboard: false,
        icon: L.divIcon({
          className: 'hb-gov-wrap',
          html: `<span class="hb-gov" data-key="${escapeHtml(group.key)}" data-selectable="${selectable}" title="${escapeHtml(`${t(group.name)}: ${cardsLabel(group.count)}`)}"><span class="hb-gov__name">${escapeHtml(t(group.name))}</span><span class="hb-gov__count">${group.count}</span></span>`,
          iconSize: null,
        }),
      }).addTo(labels);
      if (!selectable) return;
      label.on('click', () => { if (!handlers.current.picking) handlers.current.onSelectRegion(group.key); });
      label.on('mouseover', () => handlers.current.onPreviewRegion?.(group.key));
      label.on('mouseout', () => handlers.current.onPreviewRegion?.(null));
    });
  }, [visibleSites, clustered, historical]);

  // Mark the selected governorate's label.
  useEffect(() => {
    containerRef.current?.querySelectorAll('.hb-gov').forEach((el) => {
      el.dataset.selected = String(el.dataset.key === focusKey);
    });
  }, [focusKey, visibleSites]);

  // Move to the selected governorate (its pins when it has some, else its capital); back home when cleared.
  useEffect(() => {
    if (focusRef.current === focusKey) return;
    focusRef.current = focusKey;
    const map = mapRef.current;
    // The governorate's pins together with its capital, so its label stays in view.
    const points = focusKey
      ? allSites.filter((s) => getGovernorateKey(s.governorate) === focusKey && hasPosition(s)).map((s) => [s.latitude, s.longitude])
      : [];
    if (focusKey && GOVERNORATE_CENTRES[focusKey]) points.push(GOVERNORATE_CENTRES[focusKey]);
    let target;
    if (!focusKey) target = (opts) => map.flyToBounds(homeRef.current, { maxZoom: 11, ...opts });
    else if (points.length > 1) target = (opts) => map.flyToBounds(L.latLngBounds(points).pad(0.3), { maxZoom: 11, ...opts });
    else if (points.length === 1) target = (opts) => map.flyTo(points[0], REGION_ZOOM, opts);
    if (!target) return;
    viewRef.current = () => target({ animate: false });
    target({ duration: 0.6 });
  }, [focusKey, allSites]);

  // Highlight the selected card and bring it into view.
  useEffect(() => {
    const byId = new Map(visibleSites.map((site) => [site.id, site]));
    markersRef.current.forEach((marker, id) => {
      const site = byId.get(id);
      if (site) {
        const label = marker.getElement()?.getAttribute('aria-label');
        marker.setIcon(pinIcon(site, selectedSite?.id === id, historical));
        if (label) marker.getElement()?.setAttribute('aria-label', label);
      }
      marker.setZIndexOffset(selectedSite?.id === id ? 1000 : 0);
    });
    // Zoom in when the selected pin is off-screen or hidden inside a cluster.
    // Deferred a tick: clusters are only laid out after the pins are added.
    const marker = selectedSite && markersRef.current.get(selectedSite.id);
    if (!marker) return undefined;
    const map = mapRef.current;
    const { clusters } = layersRef.current;
    // In reduced-motion mode, a coincident cluster can finish zooming without
    // the plugin's animation-end callback. Explicitly reveal it at maximum zoom.
    const revealAtMaxZoom = () => {
      if (!clustered || map.getZoom() < map.getMaxZoom()) return;
      const parent = clusters.getVisibleParent(marker);
      if (parent !== marker) parent?.spiderfy?.();
    };
    map.on('zoomend moveend', revealAtMaxZoom);
    if (clustered) clusters.on('animationend', revealAtMaxZoom);
    const timer = setTimeout(() => {
      if (clustered && (!map.getBounds().contains(marker.getLatLng()) || clusters.getVisibleParent(marker) !== marker)) {
        clusters.zoomToShowLayer(marker);
        revealAtMaxZoom();
      } else if (!map.getBounds().contains(marker.getLatLng())) {
        map.panTo(marker.getLatLng());
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      map.off('zoomend moveend', revealAtMaxZoom);
      if (clustered) clusters.off('animationend', revealAtMaxZoom);
    };
  }, [selectedSite, visibleSites, clustered, historical]);

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

  const placed = visibleSites.filter(hasPosition).length;
  return (
    <div className="hb-mapx">
      <div
        ref={containerRef}
        className="hb-mapx__leaflet"
        data-picking={picking}
        data-size={size}
        data-map-mode={historical ? 'history' : 'modern'}
        data-clustered={clustered}
        role="region"
        aria-label={t('Map of card positions. The governorate list and the list of cards beside the map offer the same information.')}
      />
      <p className="hb-map__caption">
        {picking
          ? t('Click the map to place the pin, then drag it to fine-tune.')
          : caption ??
            (allSites.some(hasPosition)
              ? t('{n} of {total} cards have recorded coordinates and appear as pins. Colour shows the card type; governorate labels show all cards.', { n: placed, total: visibleSites.length })
              : t('No card in the archive has recorded coordinates yet. Use the governorate list to browse without map positions.'))}
      </p>
      {historical && <p className="hb-map__caption">{t('Round markers identify historical mode. Colors retain the card types; the modern basemap is unchanged.')}</p>}
    </div>
  );
}
