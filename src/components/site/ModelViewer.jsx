import { useEffect, useRef, useState } from 'react';
import { getModelEmbed } from '../../utils/media';
import StatePanel from '../common/StatePanel';
import MediaAttribution from './MediaAttribution';
import ModelMetadata from './ModelMetadata';
import { mediaLicenseState } from '../../utils/mediaAttribution';
import '../../styles/collections.css';
import '../../styles/model-viewer.css';
import { t } from '../../i18n';

// Version-pinned cache adapter: model-viewer 4.4 retains failed GLTF loads.
// Evict only the failed URL so retries do not dispose other cached models.
const registerModelViewer = async () => {
  const [, { CachingGLTFLoader }] = await Promise.all([
    import('@google/model-viewer'),
    import('@google/model-viewer/lib/three-components/CachingGLTFLoader.js'),
  ]);
  return { clearFailedModel: (url) => CachingGLTFLoader.delete(url) };
};

// Public controls API from the installed model-viewer 4.4 ControlsInterface.
function readCamera(node) {
  if (!node?.getCameraOrbit || !node.getCameraTarget || !node.getFieldOfView) return null;
  const { theta, phi, radius } = node.getCameraOrbit();
  const { x, y, z } = node.getCameraTarget();
  const fov = node.getFieldOfView();
  return [theta, phi, radius, x, y, z, fov].every(Number.isFinite)
    ? { theta, phi, radius, x, y, z, fov } : null;
}
const orbitText = ({ theta, phi, radius }) => `${theta}rad ${phi}rad ${radius}m`;

/** Render only a verified resource bound to the current site. */
export default function ModelViewer({
  resource,
  name,
  siteId,
  registerViewer = registerModelViewer,
  timeoutMs = 30000,
}) {
  const embed =
    resource?.verified === true && (!siteId || resource.siteId === siteId) && mediaLicenseState(resource) !== 'restricted'
      ? getModelEmbed(resource.url)
      : null;
  return (
    <Viewer
      key={embed?.src ?? 'unavailable'}
      embed={embed}
      resource={resource}
      name={name}
      registerViewer={registerViewer}
      timeoutMs={timeoutMs}
    />
  );
}

function Viewer({ embed, resource, name, registerViewer, timeoutMs }) {
  const [state, setState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const viewer = useRef(null);
  const cache = useRef(null);
  const panel = useRef(null);
  const fullscreenButton = useRef(null);
  const initialCamera = useRef(null);
  const wasNativeFullscreen = useRef(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const fullscreen = expanded || nativeFullscreen;

  useEffect(() => {
    const node = panel.current;
    const restoreFocus = () => fullscreenButton.current?.focus();
    const changed = () => {
      const active = document.fullscreenElement === node;
      setNativeFullscreen(active);
      if (!active && wasNativeFullscreen.current) restoreFocus();
      wasNativeFullscreen.current = active;
    };
    document.addEventListener('fullscreenchange', changed);
    return () => {
      document.removeEventListener('fullscreenchange', changed);
      if (node && document.fullscreenElement === node) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!expanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fullscreenButton.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
        fullscreenButton.current?.focus();
      }
      if (event.key === 'Tab') {
        const buttons = [...panel.current.querySelectorAll('*')].filter((node) =>
          node.matches('button:not(:disabled), a[href], summary, model-viewer'));
        const first = buttons[0];
        const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
    };
  }, [expanded]);

  const toggleFullscreen = async () => {
    if (expanded) { setExpanded(false); fullscreenButton.current?.focus(); return; }
    if (document.fullscreenElement === panel.current) {
      try { await document.exitFullscreen(); } catch { /* Browser may already have exited. */ }
      return;
    }
    const node = panel.current;
    try {
      if (!node.requestFullscreen) throw new Error('Fullscreen unavailable');
      await node.requestFullscreen();
    } catch {
      if (node.isConnected) setExpanded(true);
    }
  };
  const moveCamera = (action) => {
    const node = viewer.current;
    const camera = readCamera(node);
    if (!camera) return;
    const step = Math.PI / 12;
    if (action === 'left') camera.theta -= step;
    if (action === 'right') camera.theta += step;
    if (action === 'up') camera.phi = Math.max(.01, camera.phi - step);
    if (action === 'down') camera.phi = Math.min(Math.PI - .01, camera.phi + step);
    if (action === 'in') camera.radius *= .8;
    if (action === 'out') camera.radius *= 1.25;
    node.cameraOrbit = orbitText(camera);
    node.jumpCameraToGoal?.();
  };
  const resetCamera = () => {
    const camera = initialCamera.current;
    if (!camera || !viewer.current) return;
    viewer.current.cameraOrbit = orbitText(camera);
    viewer.current.cameraTarget = `${camera.x}m ${camera.y}m ${camera.z}m`;
    viewer.current.fieldOfView = `${camera.fov}deg`;
    viewer.current.jumpCameraToGoal?.();
  };

  useEffect(() => {
    if (!['loading', 'ready'].includes(state) || embed?.type !== 'model') return undefined;
    let cancelled = false;
    const node = viewer.current;
    const loaded = () => {
      initialCamera.current = readCamera(node);
      setCameraAvailable(Boolean(initialCamera.current));
      setState('ready');
    };
    const failed = () => {
      // The entry is removed synchronously before its discarded geometry is disposed.
      cache.current?.clearFailedModel?.(embed.src)?.catch(() => {});
      setExpanded(false);
      if (document.fullscreenElement === panel.current) document.exitFullscreen?.().catch(() => {});
      setState('error');
    };
    const advanced = (event) => {
      const value = event.detail?.totalProgress;
      setProgress(Number.isFinite(value) ? Math.round(Math.max(0, Math.min(1, value)) * 100) : 0);
    };
    node.addEventListener('load', loaded);
    node.addEventListener('error', failed);
    node.addEventListener('progress', advanced);
    if (state === 'loading')
      Promise.resolve()
        .then(registerViewer)
        .then((adapter) => {
          if (cancelled) return;
          cache.current = adapter;
          node.setAttribute('src', embed.src);
        })
        .catch(() => {
          if (!cancelled) failed();
        });
    const timer = state === 'loading' ? setTimeout(() => setState('error'), timeoutMs) : null;
    return () => {
      cancelled = true;
      clearTimeout(timer);
      node.removeEventListener('load', loaded);
      node.removeEventListener('error', failed);
      node.removeEventListener('progress', advanced);
    };
  }, [state, embed?.type, embed?.src, registerViewer, timeoutMs, attempt]);

  useEffect(() => {
    if (state !== 'loading' || embed?.type !== 'iframe') return undefined;
    const timer = setTimeout(() => setState('error'), timeoutMs);
    return () => clearTimeout(timer);
  }, [state, embed?.type, timeoutMs, attempt]);

  if (!embed)
    return (
      <StatePanel kind="unavailable" title={t('3D resource unavailable')} description={t('No approved 3D resource is available for this site.')} headingLevel={3} compact />
    );
  const viewable = ['model', 'iframe'].includes(embed.type);
  const start = () => {
    setProgress(0);
    setAttempt((n) => n + 1);
    setState('loading');
  };
  return (
    <div ref={panel} className={`hb-model${expanded ? ' hb-model--expanded' : ''}`} data-state={viewable ? state : 'unavailable'} role={expanded ? 'dialog' : undefined} aria-modal={expanded ? 'true' : undefined} aria-label={expanded ? t('3D model of {name}', { name }) : undefined}>
      <h3 className="hb-site__h3">{resource.title || t('3D resource')}</h3>
      {!viewable && (
        <p className="hb-model__notice">
          {t('This resource cannot be previewed here. Open or download it using the link below.')}
        </p>
      )}
      {viewable && state === 'idle' && (
        <div className="hb-model__notice">
          <p>
            {embed.type === 'iframe'
              ? t('This viewer is hosted by Sketchfab. Load it when you are ready to connect to that provider.')
              : t('Load the interactive model, then drag to rotate and scroll or pinch to zoom.')}
          </p>
          <button type="button" className="hb-btn hb-btn--ink" onClick={start}>
            {t('Load 3D viewer')}
          </button>
        </div>
      )}
      {viewable && state === 'loading' && (
        <div className="hb-model__loading">
          <p role="status">{t('Loading 3D model…')}</p>
          {embed.type === 'model' && (
            <progress aria-label={t('Model loading progress')} max="100" value={progress} />
          )}
        </div>
      )}
      {viewable && state === 'error' && (
        <StatePanel kind="error" title={t('3D model unavailable')} description={t('The 3D model could not be loaded. Your browser or the resource may be unavailable.')} headingLevel={4} compact>
          <button type="button" className="hb-btn" onClick={start}>
            {t('Retry viewer')}
          </button>
        </StatePanel>
      )}
      {['loading', 'ready'].includes(state) &&
        (embed.type === 'iframe' ? (
          <iframe
            key={attempt}
            src={embed.src}
            title={t('3D model of {name}', { name })}
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
            allow="fullscreen; xr-spatial-tracking"
          allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
            referrerPolicy="no-referrer"
          />
        ) : (
          <model-viewer
            key={attempt}
            ref={viewer}
            tabIndex={0}
            alt={t('3D model of {name}', { name })}
            camera-controls=""
            touch-action="pan-y"
            interaction-prompt="auto"
          />
        ))}
      {state === 'ready' && embed.type === 'model' && (
        <div className="hb-model__controls" role="group" aria-label={t('3D view controls')}>
          <button type="button" className="hb-btn" disabled={!cameraAvailable} onClick={() => moveCamera('left')}>{t('Rotate left')}</button>
          <button type="button" className="hb-btn" disabled={!cameraAvailable} onClick={() => moveCamera('right')}>{t('Rotate right')}</button>
          <button type="button" className="hb-btn" disabled={!cameraAvailable} onClick={() => moveCamera('up')}>{t('Rotate up')}</button>
          <button type="button" className="hb-btn" disabled={!cameraAvailable} onClick={() => moveCamera('down')}>{t('Rotate down')}</button>
          <button type="button" className="hb-btn" disabled={!cameraAvailable} onClick={() => moveCamera('in')}>{t('Zoom in')}</button>
          <button type="button" className="hb-btn" disabled={!cameraAvailable} onClick={() => moveCamera('out')}>{t('Zoom out')}</button>
          <button type="button" className="hb-btn" disabled={!cameraAvailable} onClick={resetCamera}>{t('Reset view')}</button>
          <button ref={fullscreenButton} type="button" className="hb-btn" aria-pressed={fullscreen} onClick={toggleFullscreen}>{fullscreen ? t('Exit fullscreen') : t('Enter fullscreen')}</button>
          {!cameraAvailable && <p>{t('Camera buttons are unavailable. Use the viewer controls or download the model.')}</p>}
        </div>
      )}
      {state === 'ready' && (
        <p className="hb-model__hint">
          {embed.type === 'iframe' ? t('Use the provider’s controls to rotate, zoom or reset this model.') : t('Drag to rotate. Use scroll or pinch to zoom. Keyboard controls are available when the viewer is focused.')}
        </p>
      )}
      <p>
        <a
          className="hb-link"
          href={embed.type === 'iframe' ? resource.url : embed.src}
          {...(resource.url.startsWith('/')
            ? { download: true }
            : { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {embed.format ? t('Download {format} model', { format: embed.format }) : t('Open digital resource')}
        </a>
      </p>
      <ModelMetadata resource={{ ...resource, format: resource.format || embed.format || '', provider: embed.provider || '' }} />
      <MediaAttribution media={resource} />
    </div>
  );
}
