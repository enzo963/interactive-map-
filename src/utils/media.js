const ORIGIN = 'https://heritage-bridge.invalid';

function parse(url) {
  try {
    return new URL(url, ORIGIN);
  } catch {
    return null;
  }
}
const isAbsolute = (url) => /^https?:\/\//i.test(url);

/** Video URL -> how to show it: privacy-friendly embed, native player, or plain link. */
export function getVideoEmbed(url) {
  if (!url) return null;
  const u = parse(url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, '');

  let youtubeId = null;
  if (host === 'youtu.be') youtubeId = u.pathname.slice(1);
  else if (host.endsWith('youtube.com')) youtubeId = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/)?.[1];
  if (youtubeId && /^[\w-]{6,}$/.test(youtubeId)) {
    return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtubeId}`, provider: 'YouTube' };
  }

  if (host === 'vimeo.com') {
    const id = u.pathname.match(/\/(\d+)/)?.[1];
    if (id) return { type: 'iframe', src: `https://player.vimeo.com/video/${id}`, provider: 'Vimeo' };
  }
  if (/\.(mp4|webm|ogv)$/i.test(u.pathname)) return { type: 'file', src: url };
  return { type: 'link', src: url };
}

/**
 * 3D model URL -> embed or file link.
 * Raw model files (.glb etc.) need a viewer library; until one is added we offer the file.
 */
export function getModelEmbed(url) {
  if (!url) return null;
  const u = parse(url);
  if (!u) return null;
  const format = u.pathname.match(/\.(glb|gltf|usdz|obj|fbx|ply|stl)$/i)?.[1];
  if (format) return { type: 'file', src: url, format: format.toUpperCase() };
  return isAbsolute(url) ? { type: 'iframe', src: url } : null;
}
