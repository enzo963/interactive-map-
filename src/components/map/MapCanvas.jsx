import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildMapFrame } from '../../utils/mapFrame';
import { getGovernorateKey } from '../../data/governorates';
import '../../styles/map-explorer.css';

const MIN_Z = 1;
const MAX_Z = 12;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Pan / zoom plot of card positions (no basemap: only recorded coordinates).
 *  - drag to pan, Ctrl/⌘ + scroll or the buttons to zoom, arrow keys + / - / 0 from the keyboard
 *  - dots are a pointer convenience; the results list next to the map is the accessible equivalent
 *  - the frame is fitted to ALL sites, so filtering never makes the map jump
 */
export default function MapCanvas({ allSites, visibleSites, selectedSite, onSelect }) {
  const frame = useMemo(() => buildMapFrame(allSites, 0.1), [allSites]);
  const plotRef = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });

  const measure = () => {
    const rect = plotRef.current.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  };
  const constrain = (z, x, y, w, h) => ({ z, x: clamp(x, w * (1 - z), 0), y: clamp(y, h * (1 - z), 0) });

  const zoomAt = useCallback((factor, cx, cy) => {
    if (!plotRef.current) return;
    const { w, h } = measure();
    setView((v) => {
      const z = clamp(v.z * factor, MIN_Z, MAX_Z);
      const k = z / v.z;
      return constrain(z, cx - (cx - v.x) * k, cy - (cy - v.y) * k, w, h);
    });
  }, []);

  const zoomCentre = (factor) => {
    const { w, h } = measure();
    zoomAt(factor, w / 2, h / 2);
  };

  // Ctrl/⌘ + wheel zooms at the cursor; plain wheel still scrolls the page.
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(event.deltaY < 0 ? 1.25 : 0.8, event.clientX - rect.left, event.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, frame]);

  // Bring a newly selected card into view when zoomed in.
  useEffect(() => {
    if (!frame || !selectedSite || !plotRef.current) return;
    if (!Number.isFinite(selectedSite.latitude) || !Number.isFinite(selectedSite.longitude)) return;
    const { x, y } = frame.project(selectedSite);
    const { w, h } = measure();
    setView((v) => (v.z > 1 ? constrain(v.z, w / 2 - ((x / 100) * w) * v.z, h / 2 - ((y / 100) * h) * v.z, w, h) : v));
  }, [selectedSite, frame]);

  if (!frame) {
    return <p className="hb-mapx__none">No card in the archive has recorded coordinates yet.</p>;
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y, id: event.pointerId };
    moved.current = false;
  };
  const onPointerMove = (event) => {
    const d = drag.current;
    if (!d || view.z === 1) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!moved.current && Math.hypot(dx, dy) < 4) return;
    if (!moved.current) {
      moved.current = true;
      plotRef.current.setPointerCapture(d.id);
    }
    const { w, h } = measure();
    setView((v) => constrain(v.z, d.vx + dx, d.vy + dy, w, h));
  };
  const endDrag = () => {
    drag.current = null;
    setTimeout(() => { moved.current = false; }, 0); // lets the click handler see "moved" first
  };

  const onKeyDown = (event) => {
    const { w, h } = measure();
    const pan = (dx, dy) => setView((v) => constrain(v.z, v.x + dx, v.y + dy, w, h));
    switch (event.key) {
      case 'ArrowLeft': pan(48, 0); break;
      case 'ArrowRight': pan(-48, 0); break;
      case 'ArrowUp': pan(0, 48); break;
      case 'ArrowDown': pan(0, -48); break;
      case '+': case '=': zoomCentre(1.4); break;
      case '-': case '_': zoomCentre(1 / 1.4); break;
      case '0': setView({ z: 1, x: 0, y: 0 }); break;
      default: return;
    }
    event.preventDefault();
  };

  const labels = [];
  const seen = new Map();
  for (const site of visibleSites) {
    if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) continue;
    const key = getGovernorateKey(site.governorate);
    const { x, y } = frame.project(site);
    const entry = seen.get(key) ?? { key, name: site.governorate, x: 0, y: 0, n: 0 };
    entry.x += x; entry.y += y; entry.n += 1;
    seen.set(key, entry);
  }
  seen.forEach((entry) => labels.push({ ...entry, x: entry.x / entry.n, y: entry.y / entry.n }));

  return (
    <div className="hb-mapx">
      <div className="hb-mapx__toolbar">
        <div role="group" aria-label="Map zoom">
          <button type="button" onClick={() => zoomCentre(1.4)} aria-label="Zoom in" disabled={view.z >= MAX_Z}>+</button>
          <button type="button" onClick={() => zoomCentre(1 / 1.4)} aria-label="Zoom out" disabled={view.z <= MIN_Z}>−</button>
          <button type="button" onClick={() => setView({ z: 1, x: 0, y: 0 })} disabled={view.z === 1}>Reset</button>
        </div>
        <p className="hb-mapx__hint">Drag to pan when zoomed. Ctrl or ⌘ + scroll to zoom.</p>
      </div>

      <div
        ref={plotRef}
        className="hb-mapx__plot"
        data-zoomed={view.z > 1}
        tabIndex={0}
        role="group"
        aria-label="Map of card positions. Arrow keys pan, plus and minus zoom, 0 resets. The list of cards beside the map offers the same information."
        style={{ '--ratio': frame.ratio }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div className="hb-mapx__layer" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, '--z': view.z }}>
          <svg className="hb-mapx__grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {frame.latTicks.map((t) => <line key={`la${t.value}`} x1="0" x2="100" y1={t.at} y2={t.at} vectorEffect="non-scaling-stroke" />)}
            {frame.lonTicks.map((t) => <line key={`lo${t.value}`} y1="0" y2="100" x1={t.at} x2={t.at} vectorEffect="non-scaling-stroke" />)}
          </svg>
          {frame.latTicks.map((t) => (
            <span className="hb-mapx__tick hb-mapx__tick--lat" style={{ '--y': `${t.at}%` }} key={`tl${t.value}`} aria-hidden="true">{Math.abs(t.value)}°{t.value >= 0 ? 'N' : 'S'}</span>
          ))}
          {frame.lonTicks.map((t) => (
            <span className="hb-mapx__tick hb-mapx__tick--lon" style={{ '--x': `${t.at}%` }} key={`tn${t.value}`} aria-hidden="true">{Math.abs(t.value)}°{t.value >= 0 ? 'E' : 'W'}</span>
          ))}
          {view.z <= 2.5 && labels.map((label) => (
            <span className="hb-mapx__label" style={{ '--x': `${label.x}%`, '--y': `${label.y}%` }} key={label.key} aria-hidden="true">{label.name}</span>
          ))}
          {visibleSites.map((site) => {
            if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) return null;
            const { x, y } = frame.project(site);
            return (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="hb-mapx__dot"
                data-selected={selectedSite?.id === site.id}
                style={{ '--x': `${x}%`, '--y': `${y}%` }}
                onClick={() => { if (!moved.current) onSelect(site); }}
                key={site.id}
              />
            );
          })}
        </div>
      </div>
      <p className="hb-map__caption">Positions are plotted from recorded coordinates. Boundaries are not shown.</p>
    </div>
  );
}
