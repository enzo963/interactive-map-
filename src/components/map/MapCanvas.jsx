import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildMapFrame } from '../../utils/mapFrame';
import { getGovernorateKey } from '../../data/governorates';
import '../../styles/map-explorer.css';
import '../../styles/phase4.css';

const MIN_Z = 1;
const MAX_Z = 12;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const hasCoordinates = (site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude);

/**
 * The view is stored as zoom `z` plus a pan offset (x, y) expressed as a FRACTION of the plot
 * size, and applied with percentage translates. That keeps every state update pure (no DOM
 * measuring), so centering on a selected card can be derived without an effect.
 */
const constrain = (z, x, y) => ({ z, x: clamp(x, 1 - z, 0), y: clamp(y, 1 - z, 0) });
const centreOn = (z, fx, fy) => constrain(z, 0.5 - fx * z, 0.5 - fy * z);
const HOME = { z: 1, x: 0, y: 0 };

/**
 * Coordinate plot of card positions. Used whenever verified boundary geometry is unavailable.
 *  - drag to pan when zoomed, Ctrl/⌘ + scroll or the buttons to zoom, arrow keys + / - / 0 from the keyboard
 *  - dots are a pointer convenience; the list of cards beside the map is the accessible equivalent
 *  - the frame is fitted to ALL sites, so filtering never makes the map jump
 *  - `focusKey` (a governorate key) emphasises that governorate's dots
 */
export default function MapCanvas({ allSites, visibleSites, selectedSite, focusKey = null, onSelect }) {
  const frame = useMemo(() => buildMapFrame(allSites, 0.1), [allSites]);
  const plotRef = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);
  const [view, setView] = useState(HOME);
  const [centredId, setCentredId] = useState(null);

  // Centre on a newly selected card when zoomed in. Derived while rendering (the documented
  // "adjust state when a prop changes" pattern) instead of calling setState inside an effect.
  const selectedId = selectedSite?.id ?? null;
  if (selectedId !== centredId) {
    setCentredId(selectedId);
    if (frame && selectedSite && hasCoordinates(selectedSite) && view.z > 1) {
      const { x, y } = frame.project(selectedSite);
      setView(centreOn(view.z, x / 100, y / 100));
    }
  }

  const zoomAt = useCallback((factor, fx, fy) => {
    setView((v) => {
      const z = clamp(v.z * factor, MIN_Z, MAX_Z);
      const k = z / v.z;
      return constrain(z, fx - (fx - v.x) * k, fy - (fy - v.y) * k);
    });
  }, []);

  // Ctrl/⌘ + wheel zooms at the cursor; a plain wheel still scrolls the page.
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(event.deltaY < 0 ? 1.25 : 0.8, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, frame]);

  if (!frame) {
    return <p className="hb-mapx__none">No card in the archive has recorded coordinates yet.</p>;
  }

  const size = () => plotRef.current.getBoundingClientRect();

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
    const { width, height } = size();
    setView((v) => constrain(v.z, d.vx + dx / width, d.vy + dy / height));
  };
  const endDrag = () => {
    drag.current = null;
    setTimeout(() => { moved.current = false; }, 0); // lets a click handler see "moved" first
  };

  const onKeyDown = (event) => {
    const { width, height } = size();
    const pan = (dx, dy) => setView((v) => constrain(v.z, v.x + dx / width, v.y + dy / height));
    switch (event.key) {
      case 'ArrowLeft': pan(48, 0); break;
      case 'ArrowRight': pan(-48, 0); break;
      case 'ArrowUp': pan(0, 48); break;
      case 'ArrowDown': pan(0, -48); break;
      case '+': case '=': zoomAt(1.4, 0.5, 0.5); break;
      case '-': case '_': zoomAt(1 / 1.4, 0.5, 0.5); break;
      case '0': setView(HOME); break;
      default: return;
    }
    event.preventDefault();
  };

  const placed = visibleSites.filter(hasCoordinates);
  const labelMap = new Map();
  for (const site of placed) {
    const key = getGovernorateKey(site.governorate);
    const { x, y } = frame.project(site);
    const entry = labelMap.get(key) ?? { key, name: site.governorate, x: 0, y: 0, n: 0 };
    entry.x += x;
    entry.y += y;
    entry.n += 1;
    labelMap.set(key, entry);
  }
  const labels = [...labelMap.values()].map((entry) => ({ ...entry, x: entry.x / entry.n, y: entry.y / entry.n }));

  return (
    <div className="hb-mapx">
      <div className="hb-mapx__toolbar">
        <div role="group" aria-label="Map zoom">
          <button type="button" onClick={() => zoomAt(1.4, 0.5, 0.5)} aria-label="Zoom in" disabled={view.z >= MAX_Z}>+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.4, 0.5, 0.5)} aria-label="Zoom out" disabled={view.z <= MIN_Z}>−</button>
          <button type="button" onClick={() => setView(HOME)} disabled={view.z === 1}>Reset</button>
        </div>
        <p className="hb-mapx__hint">Drag to pan when zoomed. Ctrl or ⌘ + scroll to zoom.</p>
      </div>

      <div
        ref={plotRef}
        className="hb-mapx__plot"
        data-zoomed={view.z > 1}
        data-has-focus={Boolean(focusKey)}
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
        <div className="hb-mapx__layer" style={{ transform: `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.z})`, '--z': view.z }}>
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
          {placed.map((site) => {
            const { x, y } = frame.project(site);
            return (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="hb-mapx__dot"
                data-selected={selectedSite?.id === site.id}
                data-in-focus={focusKey ? getGovernorateKey(site.governorate) === focusKey : undefined}
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
