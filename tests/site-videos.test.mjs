// Site Details videos: institutional publishers only, verified records, optional for publishing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { videosForSite, formatDuration, MAX_VIDEOS_PER_SITE } = await server.ssrLoadModule('/src/utils/siteVideos.js');
const { SiteVideos } = await server.ssrLoadModule('/src/components/site/SiteSections.jsx');
const { getAllSites } = await server.ssrLoadModule('/src/services/siteService.js');
const { isVisibleCard } = await server.ssrLoadModule('/src/utils/cardReadiness.js');
after(async () => { await server.close(); });

const data = JSON.parse(readFileSync(new URL('../src/data/site-videos.json', import.meta.url), 'utf8'));
const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const ids = new Set(records.map((record) => record.id));

test('every video record is complete, from a listed institution, and linked to existing cards', () => {
  assert.ok(data.videos.length > 0);
  const seen = new Set();
  for (const video of data.videos) {
    const label = video.videoId;
    assert.equal(video.provider, 'youtube', label);
    assert.match(video.videoId, /^[\w-]{11}$/, label);
    assert.ok(!seen.has(video.videoId), `${label}: listed twice`);
    seen.add(video.videoId);
    assert.equal(video.url, `https://www.youtube.com/watch?v=${video.videoId}`, label);
    const publisher = data.publishers[video.publisher];
    assert.ok(publisher, `${label}: unknown publisher`);
    assert.ok(data.publisherTypes.includes(publisher.type), `${label}: publisher type`);
    assert.match(publisher.channelUrl, /^https:\/\/www\.youtube\.com\/@[\w.-]+$/, `${label}: channel`);
    assert.equal(video.verification.method, 'youtube-oembed', label);
    assert.equal(video.verification.channelUrl, publisher.channelUrl, `${label}: verified against its publisher's channel`);
    assert.match(video.verification.checkedAt, /^\d{4}-\d{2}-\d{2}$/, label);
    assert.ok(video.title.trim() && video.summary.trim().length >= 40, `${label}: title and summary`);
    assert.match(video.published, /^\d{4}-\d{2}-\d{2}$/, label);
    assert.ok(Number.isInteger(video.durationSeconds) && video.durationSeconds > 0, label);
    assert.ok(video.sites.length > 0, label);
    for (const link of video.sites) {
      assert.ok(ids.has(link.siteId), `${label}: no card ${link.siteId}`);
      assert.ok(['site', 'part', 'context'].includes(link.relation), label);
      if (link.relation !== 'site') assert.ok(link.note?.trim(), `${label}: a ${link.relation} link explains itself`);
    }
  }
});

test('a card shows its own videos first and at most three', () => {
  const counts = new Map();
  for (const video of data.videos) for (const { siteId } of video.sites) counts.set(siteId, (counts.get(siteId) ?? 0) + 1);
  for (const [siteId, count] of counts) {
    const videos = videosForSite(siteId);
    assert.equal(videos.length, Math.min(count, MAX_VIDEOS_PER_SITE), siteId);
    const order = videos.map((video) => ({ site: 0, part: 1, context: 2 })[video.relation]);
    assert.deepEqual(order, [...order].sort(), `${siteId}: relation order`);
  }
});

test('unlisted publishers and malformed IDs are never shown', () => {
  const base = { publisherTypes: ['museum'], publishers: { m: { name: 'Museum', type: 'museum' }, v: { name: 'Vlog', type: 'travel-vlog' } } };
  const video = (over) => ({ provider: 'youtube', videoId: 'abcdefghijk', title: 'A', publisher: 'm', sites: [{ siteId: 's', relation: 'site' }], ...over });
  assert.equal(videosForSite('s', { ...base, videos: [video({})] }).length, 1);
  assert.equal(videosForSite('s', { ...base, videos: [video({ publisher: 'v' })] }).length, 0);
  assert.equal(videosForSite('s', { ...base, videos: [video({ publisher: 'unknown' })] }).length, 0);
  assert.equal(videosForSite('s', { ...base, videos: [video({ videoId: 'bad id"><' })] }).length, 0);
  assert.equal(videosForSite('s', { ...base, videos: [video({ provider: 'vimeo' })] }).length, 0);
  assert.equal(videosForSite('s', { ...base, videos: [video({ sites: [{ siteId: 's', relation: 'maybe' }] })] }).length, 0);
});

test('videos never decide whether a card is published', () => {
  const visible = records.filter((record) => isVisibleCard(record)).length;
  const sites = getAllSites();
  assert.equal(sites.length, visible);
  const withVideo = sites.filter((site) => site.videos.length > 0);
  assert.ok(withVideo.length >= 15 && withVideo.length < sites.length, 'most cards have no video and are still published');
  for (const site of withVideo) assert.equal(site.hasVideo, true, site.id);
});

test('the player loads nothing from the provider until the visitor presses play', () => {
  const [video] = videosForSite('site-001');
  const html = renderToStaticMarkup(React.createElement(SiteVideos, { videos: [video], name: 'Hatra' }));
  assert.ok(!html.includes('<iframe'), 'no iframe before play');
  assert.ok(!/ytimg|youtube-nocookie/.test(html), 'no provider request before play');
  assert.match(html, /<button type="button" class="hb-video__play" aria-label="Play video: Hatra \(UNESCO\/NHK\), by UNESCO">/);
  assert.match(html, /href="https:\/\/www\.youtube\.com\/watch\?v=bWKb8NSq9VE"/);
  assert.match(html, /UNESCO<span class="sr-only">/);
  assert.match(html, /Credit: UNESCO TV \/ © NHK Nippon Hoso Kyokai/);
  assert.equal(formatDuration(169), '2:49');
  assert.equal(formatDuration(3994), '1:06:34');
});
