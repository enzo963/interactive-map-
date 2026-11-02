import { useEffect, useRef, useState } from 'react';
import { getModelEmbed } from '../../utils/media';
import StatePanel from '../common/StatePanel';
import '../../styles/collections.css';

// Version-pinned cache adapter: model-viewer 4.4 retains failed GLTF loads.
// Evict only the failed URL so retries do not dispose other cached models.
const registerModelViewer = async () => {
  const [, { CachingGLTFLoader }] = await Promise.all([
    import('@google/model-viewer'),
    import('@google/model-viewer/lib/three-components/CachingGLTFLoader.js'),
  ]);
  return { clearFailedModel: (url) => CachingGLTFLoader.delete(url) };
};

/** Render only a verified resource bound to the current site. */
export default function ModelViewer({
  resource,
  name,
  siteId,
  registerViewer = registerModelViewer,
  timeoutMs = 30000,
}) {
  const embed =
    resource?.verified === true && (!siteId || resource.siteId === siteId)
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

  useEffect(() => {
    if (!['loading', 'ready'].includes(state) || embed?.type !== 'model') return undefined;
    let cancelled = false;
    const node = viewer.current;
    const loaded = () => setState('ready');
    const failed = () => {
      // The entry is removed synchronously before its discarded geometry is disposed.
      cache.current?.clearFailedModel(embed.src).catch(() => {});
      setState('error');
    };
    const advanced = (event) =>
      setProgress(Math.round(Math.max(0, Math.min(1, event.detail?.totalProgress ?? 0)) * 100));
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
      <StatePanel kind="unavailable" title="3D resource unavailable" description="No approved 3D resource is available for this site." headingLevel={3} compact />
    );
  const viewable = ['model', 'iframe'].includes(embed.type);
  const start = () => {
    setProgress(0);
    setAttempt((n) => n + 1);
    setState('loading');
  };
  return (
    <div className="hb-model" data-state={viewable ? state : 'unavailable'}>
      <h3 className="hb-site__h3">{resource.title || '3D resource'}</h3>
      {!viewable && (
        <p className="hb-model__notice">
          This resource cannot be previewed here. Open or download it using the link below.
        </p>
      )}
      {viewable && state === 'idle' && (
        <div className="hb-model__notice">
          <p>
            {embed.type === 'iframe'
              ? 'This viewer is hosted by Sketchfab. Load it when you are ready to connect to that provider.'
              : 'Load the interactive model, then drag to rotate and scroll or pinch to zoom.'}
          </p>
          <button type="button" className="hb-btn hb-btn--ink" onClick={start}>
            Load 3D viewer
          </button>
        </div>
      )}
      {viewable && state === 'loading' && (
        <div className="hb-model__loading">
          <p role="status">Loading 3D model…</p>
          {embed.type === 'model' && (
            <progress aria-label="Model loading progress" max="100" value={progress} />
          )}
        </div>
      )}
      {viewable && state === 'error' && (
        <StatePanel kind="error" title="3D model unavailable" description="The 3D model could not be loaded. Your browser or the resource may be unavailable." headingLevel={4} compact>
          <button type="button" className="hb-btn" onClick={start}>
            Retry viewer
          </button>
        </StatePanel>
      )}
      {['loading', 'ready'].includes(state) &&
        (embed.type === 'iframe' ? (
          <iframe
            key={attempt}
            src={embed.src}
            title={`3D model of ${name}`}
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
            alt={`3D model of ${name}`}
            camera-controls=""
            touch-action="pan-y"
            interaction-prompt="auto"
          />
        ))}
      {state === 'ready' && (
        <p className="hb-model__hint">
          Drag to rotate. Use scroll or pinch to zoom. Keyboard controls are available when the viewer is
          focused.
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
          {embed.format ? `Download ${embed.format} model` : 'Open digital resource'}
        </a>
      </p>
      {(resource.credit || resource.license) && (
        <p className="hb-model__credit">
          {[
            resource.credit && `Credit: ${resource.credit}`,
            resource.license && `License: ${resource.license}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}
