const ORIGIN = 'https://heritage-bridge.invalid';

function parse(url) {
  try {
    return new URL(url, ORIGIN);
  } catch {
    return null;
  }
}

/** Video URL -> how to show it: privacy-friendly embed, native player, or plain link. */
export function getVideoEmbed(url) {
  if (!url) return null;
  const u = parse(url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, '');

  let youtubeId = null;
  if (host === 'youtu.be') youtubeId = u.pathname.slice(1);
  else if (host.endsWith('youtube.com'))
    youtubeId = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/)?.[1];
  if (youtubeId && /^[\w-]{6,}$/.test(youtubeId)) {
    return {
      type: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      provider: 'YouTube',
    };
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
 * GLB/glTF use the reusable viewer; other formats remain downloads. Only known providers embed.
 */
export function getModelEmbed(url) {
  if (
    typeof url !== 'string' ||
    !url ||
    /[\s\\]/.test(url) ||
    [...url].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
    url.startsWith('//')
  )
    return null;
  const local = url.startsWith('/');
  if (!local && !/^https:\/\//i.test(url)) return null;
  const u = parse(url);
  if (!u || (!local && u.protocol !== 'https:') || u.username || u.password) return null;
  const format = u.pathname.match(/\.(glb|gltf|usdz|obj|fbx|ply|stl)$/i)?.[1];
  if (format)
    return {
      type: ['glb', 'gltf'].includes(format.toLowerCase()) ? 'model' : 'file',
      src: url,
      format: format.toUpperCase(),
    };
  if (['sketchfab.com', 'www.sketchfab.com'].includes(u.hostname)) {
    const id =
      u.pathname.match(/\/models\/([a-f0-9]{32})(?:\/|$)/i)?.[1] ??
      u.pathname.match(/\/3d-models\/(?:[^/]*-)?([a-f0-9]{32})(?:\/|$)/i)?.[1];
    if (id) return { type: 'iframe', src: `https://sketchfab.com/models/${id}/embed`, provider: 'Sketchfab' };
  }
  return !local ? { type: 'link', src: url } : null;
}
