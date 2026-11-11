import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { pictureSources, IMAGE_ROLES } = await server.ssrLoadModule('/src/utils/imageVariants.js');
const ResponsiveImage = (await server.ssrLoadModule('/src/components/common/ResponsiveImage.jsx')).default;
after(async () => { await server.close(); });

const records = JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8'));
const approved = records.filter((record) => record.image_status === 'approved');
const file = (url) => new URL(`../public${url}`, import.meta.url);
// Upper bounds per rendition: well above the typical size, low enough to catch an unoptimized file.
const MAX_BYTES = { 320: 80_000, 640: 220_000, 960: 360_000, 1280: 600_000 };

test('every approved image has optimized renditions on disk, within size limits', () => {
  assert.ok(approved.length > 0);
  for (const { id, coverImage } of approved) {
    const { variants } = coverImage;
    assert.ok(variants, `${id}: no variants (run tools/content-pipeline/optimize_images.py)`);
    assert.ok(variants.width <= 1280 && variants.height > 0, `${id}: dimensions`);
    for (const format of ['avif', 'webp', 'jpeg']) {
      assert.ok(variants[format]?.length, `${id}: no ${format}`);
      for (const width of variants[format]) {
        const path = file(`${variants.base}-${width}.${format}`);
        assert.ok(existsSync(path), `${id}: missing ${variants.base}-${width}.${format}`);
        const limit = Object.entries(MAX_BYTES).find(([max]) => width <= Number(max))[1];
        assert.ok(statSync(path).size <= limit, `${id}: ${width}.${format} is ${statSync(path).size} bytes`);
      }
    }
  }
});

test('card grids never receive gallery or full-size files', () => {
  for (const { id, coverImage } of approved) {
    const card = pictureSources(coverImage, 'card');
    const widths = [...card.sources.flatMap(({ srcSet }) => srcSet.split(', ').map((entry) => Number(entry.split(' ')[1].slice(0, -1)))),
      Number(card.src.match(/-(\d+)\.\w+$/)[1])];
    assert.ok(widths.every((width) => width <= IMAGE_ROLES.card), `${id}: ${widths}`);
    assert.doesNotMatch(card.src, /wikimedia/, `${id}: card falls back to the remote original`);
  }
});

const image = { src: 'https://upload.wikimedia.org/original.jpg', variants: {
  base: '/images/sites/test/abc', width: 1280, height: 853, color: '#a08060',
  avif: [320, 640], webp: [320, 640, 960, 1280], jpeg: [640] } };

test('a card image offers AVIF and WebP by viewport, a JPEG fallback, fixed dimensions and lazy loading', () => {
  const html = renderToStaticMarkup(React.createElement(ResponsiveImage, { image, alt: 'Test site', role: 'card' }));
  assert.match(html, /<source type="image\/avif" srcSet="\/images\/sites\/test\/abc-320\.avif 320w, \/images\/sites\/test\/abc-640\.avif 640w" sizes="[^"]+"/);
  assert.match(html, /<source type="image\/webp" srcSet="\/images\/sites\/test\/abc-320\.webp 320w, \/images\/sites\/test\/abc-640\.webp 640w"/);
  assert.match(html, /<img[^>]+src="\/images\/sites\/test\/abc-640\.jpeg"/);
  assert.match(html, /width="1280" height="853"/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /fetchpriority|original\.jpg|-1280\./i);
});

test('above-the-fold images load at once with high priority; the viewer may use full-size files', () => {
  const html = renderToStaticMarkup(React.createElement(ResponsiveImage, { image, alt: 'Test site', role: 'gallery', priority: true }));
  assert.match(html, /loading="eager"/);
  assert.match(html, /fetchPriority="high"/i);
  assert.match(html, /abc-1280\.webp 1280w/);
});

test('an image without renditions still renders its source', () => {
  const html = renderToStaticMarkup(React.createElement(ResponsiveImage, { image: { src: '/plain.jpg' }, alt: 'Plain' }));
  assert.match(html, /<img[^>]+src="\/plain\.jpg"[^>]+loading="lazy"/);
});

test('a reviewed focus point steers the card crop, and only the card crop', () => {
  const focused = { ...image, focus: '50% 0%' };
  assert.match(renderToStaticMarkup(React.createElement(ResponsiveImage, { image: focused, alt: 'Minaret', role: 'card' })), /object-position:50% 0%/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(ResponsiveImage, { image: focused, alt: 'Minaret', role: 'gallery' })), /object-position/);
  for (const { id, coverImage } of approved) {
    if (coverImage.focus !== undefined) assert.match(coverImage.focus, /^\d{1,3}% \d{1,3}%$/, id);
  }
});

// Additional photographs (galleryImages) on flagship records: see tools/content-pipeline/apply_gallery_review.py.
const galleryApproved = (img) => img.license_status === 'verified' && img.publication_approval?.status === 'approved';
const galleries = records.flatMap((record) => (record.galleryImages || []).filter(galleryApproved).map((img) => ({ record, img })));

test('every approved gallery image is bound to its site, attributed and optimized', () => {
  assert.ok(galleries.length > 0);
  for (const { record, img } of galleries) {
    const label = `${record.id}: ${img.sourceUrl}`;
    assert.equal(img.siteId, record.id, label);
    assert.equal(img.publication_approval.siteId, record.id, label);
    assert.equal(img.publication_approval.image_url, img.src, label);
    assert.equal(img.license_review.image_url, img.src, label);
    assert.ok(img.credit?.trim() && img.license?.trim() && img.alt?.trim(), `${label}: credit, license and alt`);
    assert.doesNotMatch(img.credit, /[\u0000-\u001f\u200b-\u200f\ufeff\ufffc]/, `${label}: invisible characters in the credit`);
    assert.match(img.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, label);
    if (!/public domain/i.test(img.license)) assert.match(img.license_url, /^https?:\/\//, `${label}: license URL`);
    assert.doesNotMatch(img.license, /\b(NC|ND)\b/, label);
    assert.ok(img.variants, `${label}: no variants (run tools/content-pipeline/optimize_images.py)`);
    for (const format of ['avif', 'webp', 'jpeg']) {
      for (const width of img.variants[format] || []) {
        assert.ok(existsSync(file(`${img.variants.base}-${width}.${format}`)), `${label}: missing ${width}.${format}`);
      }
    }
  }
});

test('galleries stay focused: at most six images, none repeats the cover or another record', () => {
  const seen = new Map();
  for (const record of records) {
    const gallery = record.galleryImages || [];
    assert.ok(gallery.length <= 6, `${record.id}: ${gallery.length} gallery images`);
    const pages = [record.image_status === 'approved' ? record.coverImage?.sourceUrl : null, ...gallery.map((img) => img.sourceUrl)].filter(Boolean);
    for (const page of pages) {
      assert.ok(!seen.has(page), `${page} is used by ${seen.get(page)} and ${record.id}`);
      seen.set(page, record.id);
    }
  }
});
