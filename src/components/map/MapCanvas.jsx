import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildMapFrame } from '../../utils/mapFrame';
import { getGovernorateKey } from '../../data/governorates';
import '../../styles/map-explorer.css';
import '../../styles/phase4.css';


const canvasStyles = `
.hb-mapx--interactive .hb-mapx__toolbar button { min-height: 2.75rem; min-width: 2.75rem; }
.hb-mapx--interactive .hb-mapx__plot { min-height: clamp(16rem, 45vw, 28rem); }
.hb-mapx--interactive .hb-mapx__dot,
.hb-mapx--interactive .hb-mapx__dot[data-selected='true'] {
  --point-color: var(--hb-ink);
  width: 2.75rem; height: 2.75rem; margin: 0; border: 0; background: transparent;
  transform: translate(-50%, -50%) scale(calc(1 / var(--z))); transform-origin: center;
}
.hb-mapx--interactive .hb-mapx__dot::before {
  inset: auto; left: 50%; top: 50%; width: .8rem; height: .8rem;
  background: var(--point-color); border: 1px solid var(--hb-paper-raised);
  transform: translate(-50%, -50%) rotate(45deg); pointer-events: none;
}
.hb-mapx--interactive .hb-mapx__dot:hover,
.hb-mapx--interactive .hb-mapx__dot:focus-visible { --point-color: var(--hb-terracotta-deep); z-index: 4; }
.hb-mapx--interactive .hb-mapx__dot[data-selected='true'] { --point-color: var(--hb-terracotta); z-index: 5; }
.hb-mapx--interactive .hb-mapx__dot[data-selected='true']::before { width: 1rem; height: 1rem; outline: 2px solid var(--hb-ink); outline-offset: 3px; }
.hb-mapx--interactive button.hb-mapx__label { min-height: 2.75rem; border: 1px solid var(--hb-rule-strong); cursor: pointer; pointer-events: auto; white-space: normal; max-width: 12rem; line-height: 1.4; z-index: 2; transform: scale(calc(1 / var(--z))) translate(-50%, 1.75rem); }
.hb-mapx--interactive button.hb-mapx__label[aria-pressed='true'] { background: var(--hb-ink); color: var(--hb-paper); }
.hb-mapx--interactive button.hb-mapx__label:hover { border-color: var(--hb-terracotta-deep); }
.hb-mapx--interactive .hb-mapx__zoom-status { font-variant-numeric: tabular-nums; font-size: .85rem; }
`;

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
 *  - dots and governorate labels support pointer and keyboard selection; the result list is an alternative
 *  - the frame is fitted to ALL sites, so filtering never makes the map jump
 *  - `focusKey` (a governorate key) emphasises that governorate's dots
 */
export default function MapCanvas({ allSites, visibleSites, selectedSite, focusKey = null, onSelect, onSelectRegion, onPreviewRegion }) {
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
    if (event.button !== 0 || !event.isPrimary) return;
    drag.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y, id: event.pointerId };
    moved.current = false;
  };
  const onPointerMove = (event) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId || view.z === 1) return;
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
  const endDrag = (event) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (plotRef.current.hasPointerCapture(event.pointerId)) plotRef.current.releasePointerCapture(event.pointerId);
    // Keep the drag flag through the following click; the next pointer-down resets it.
  };

  const onKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
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
    <div className="hb-mapx hb-mapx--interactive">
      <style href="hb-map-canvas-interactions" precedence="components">{canvasStyles}</style>
      <div className="hb-mapx__toolbar">
        <div role="group" aria-label="Map zoom">
          <button type="button" onClick={() => zoomAt(1.4, 0.5, 0.5)} aria-label="Zoom in" disabled={view.z >= MAX_Z}>+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.4, 0.5, 0.5)} aria-label="Zoom out" disabled={view.z <= MIN_Z}>−</button>
          <button type="button" onClick={() => setView(HOME)} disabled={view.z === 1}>Reset</button>
        </div>
        <span className="hb-mapx__zoom-status" role="status" aria-label="Zoom level">{Math.round(view.z * 100)}%</span>
        <p className="hb-mapx__hint">Tap a point to select a card. Use + / − to zoom, then drag to pan. Reset restores page scrolling on touch screens.</p>
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
        onLostPointerCapture={() => { drag.current = null; }}
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
            onSelectRegion ? (
              <button type="button" className="hb-mapx__label" style={{ '--x': `${label.x}%`, '--y': `${label.y}%` }} key={label.key}
                aria-pressed={focusKey === label.key} aria-label={`${label.name}, ${label.n} matching ${label.n === 1 ? 'card' : 'cards'}`}
                onClick={(event) => { if (event.detail === 0 || !moved.current) onSelectRegion(label.key); }}
                onPointerEnter={(event) => { if (event.pointerType === 'mouse') onPreviewRegion?.(label.key); }}
                onPointerLeave={() => onPreviewRegion?.(null)} onFocus={() => onPreviewRegion?.(label.key)} onBlur={() => onPreviewRegion?.(null)}>
                {label.name} · {label.n}
              </button>
            ) : <span className="hb-mapx__label" style={{ '--x': `${label.x}%`, '--y': `${label.y}%` }} key={label.key} aria-hidden="true">{label.name} · {label.n}</span>
          ))}
          {placed.map((site) => {
            const { x, y } = frame.project(site);
            return (
              <button
                type="button"
                aria-label={`${site.name}, ${site.governorate}`}
                aria-pressed={selectedSite?.id === site.id}
                title={`${site.name} · ${site.governorate}`}
                className="hb-mapx__dot"
                data-selected={selectedSite?.id === site.id}
                data-in-focus={focusKey ? getGovernorateKey(site.governorate) === focusKey : undefined}
                style={{ '--x': `${x}%`, '--y': `${y}%` }}
                onClick={(event) => { if (event.detail === 0 || !moved.current) onSelect(site); }}
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
