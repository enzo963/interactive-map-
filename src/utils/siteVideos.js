import catalog from '../data/site-videos.json';

/**
 * Videos for Site Details, from src/data/site-videos.json (see src/data/README.md).
 * A video is shown only when its publisher is a listed institution of a known type and its
 * provider ID is well formed. Videos are optional enrichment: they never affect whether a card
 * is published (src/utils/cardReadiness.js does not read them).
 */
const YOUTUBE_ID = /^[\w-]{11}$/;
const RELATION_ORDER = { site: 0, part: 1, context: 2 };
export const MAX_VIDEOS_PER_SITE = 3;

function normalize(video, link, data) {
  const publisher = data.publishers?.[video.publisher];
  if (!publisher || !data.publisherTypes?.includes(publisher.type)) return null;
  if (video.provider !== 'youtube' || !YOUTUBE_ID.test(video.videoId ?? '')) return null;
  return {
    key: `youtube:${video.videoId}`,
    videoId: video.videoId,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}`,
    title: String(video.title ?? '').trim(),
    publisher: { name: publisher.name, type: publisher.type, website: publisher.website ?? '' },
    credit: video.credit ?? '',
    year: /^\d{4}/.test(video.published ?? '') ? video.published.slice(0, 4) : '',
    durationSeconds: Number.isFinite(video.durationSeconds) ? video.durationSeconds : null,
    language: typeof video.language === 'string' ? video.language : '',
    kind: video.kind ?? '',
    summary: video.summary ?? '',
    relation: link.relation,
    note: link.note ?? '',
  };
}

/** The videos linked to one card, the site's own first, at most MAX_VIDEOS_PER_SITE. */
export function videosForSite(siteId, data = catalog) {
  const found = [];
  for (const video of Array.isArray(data?.videos) ? data.videos : []) {
    const link = (video.sites ?? []).find((item) => item?.siteId === siteId && item.relation in RELATION_ORDER);
    const normalized = link && normalize(video, link, data);
    if (normalized && normalized.title && !found.some((item) => item.key === normalized.key)) found.push(normalized);
  }
  return found
    .map((video, index) => ({ video, index }))
    .sort((a, b) => RELATION_ORDER[a.video.relation] - RELATION_ORDER[b.video.relation] || a.index - b.index)
    .slice(0, MAX_VIDEOS_PER_SITE)
    .map(({ video }) => video);
}

/** 3994 -> "1:06:34", 169 -> "2:49". */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
