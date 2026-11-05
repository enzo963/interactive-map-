"""Generate web-optimized renditions of every approved heritage image.

For each approved cover (and approved gallery image) in src/data/sites.json this downloads the
source once (cached in data/image-cache/), converts it to sRGB without metadata, and writes
renditions to public/images/sites/<slug>/:

  role     width  formats            used by
  thumb     320   AVIF, WebP         gallery thumbnails, cards on narrow phones
  card      640   AVIF, WebP, JPEG   card grids; the JPEG is the fallback for browsers without AVIF/WebP
  gallery   960   WebP               Site Details viewer on tablets and laptops
  full     1280   WebP               full view on large or high-density screens

Sources are never upscaled: a narrower source caps the list at its own width. When Wikimedia
rate-limits a whole original, the widest standard thumbnail below its width is used instead. File names carry a
hash of the source bytes and encoder settings (`<hash>-<width>.<ext>`), so a changed image gets a
new URL and every URL can be cached as immutable. The image record gains `variants`:
{base, hash, width, height, color, avif: [...widths], webp: [...], jpeg: [...]}.

Usage (from this directory):
    python3 optimize_images.py            # generate missing renditions and update sites.json
    python3 optimize_images.py --check    # report what is missing, change nothing
"""
import hashlib
import io
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SITES = ROOT / 'src' / 'data' / 'sites.json'
CACHE = BASE / 'data' / 'image-cache'
OUT = ROOT / 'public' / 'images' / 'sites'
PUBLIC_PREFIX = '/images/sites'
UA = 'HistoryInCards-research/1.0'

ROLES = {'thumb': 320, 'card': 640, 'gallery': 960, 'full': 1280}
FORMATS = {  # format -> roles it is generated for
    'avif': ('thumb', 'card'),
    'webp': ('thumb', 'card', 'gallery', 'full'),
    'jpeg': ('card',),
}
ENCODE = {
    'avif': ('AVIF', {'quality': 52, 'speed': 6}),
    'webp': ('WEBP', {'quality': 74, 'method': 6}),
    'jpeg': ('JPEG', {'quality': 80, 'optimize': True, 'progressive': True}),
}
# Byte budget per rendition width. Fine-grained subjects (rock reliefs, masonry) can exceed it at the
# default quality; quality then steps down, never below FLOOR, which keeps degradation invisible.
BUDGET = {320: 60_000, 640: 180_000, 960: 300_000, 1280: 500_000}
FLOOR = {'avif': 36, 'webp': 56, 'jpeg': 62}
SETTINGS = json.dumps([ROLES, FORMATS, {k: v[1] for k, v in ENCODE.items()}, BUDGET, FLOOR], sort_keys=True)


# Thumbnail widths Wikimedia serves (https://w.wiki/GHai); other widths are refused.
WIKIMEDIA_BUCKETS = (330, 500, 960, 1280)


def candidates(image_record):
    """The recorded source first. Wikimedia rate-limits whole originals, so for an original that is not
    already a thumbnail, fall back to the widest standard thumbnail below the original's width."""
    url = image_record['src']
    yield url
    match = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons)/(\w)/(\w\w)/([^?]+)$', url.split('?')[0])
    width = image_record.get('width') or 0
    buckets = [bucket for bucket in WIKIMEDIA_BUCKETS if bucket < width]
    if match and buckets:
        root, a, ab, name = match.groups()
        yield f'{root}/thumb/{a}/{ab}/{name}/{buckets[-1]}px-{name}'


def download(image_record, path):
    for url in candidates(image_record):
        for attempt in range(2):
            subprocess.run(['curl', '-s', '-L', '-A', UA, '--max-time', '60', '-o', str(path), url], check=False)
            if path.exists() and path.read_bytes()[:3] in (b'\xff\xd8\xff', b'\x89PN', b'GIF', b'RIF'):
                return url
            path.unlink(missing_ok=True)
            time.sleep(6)
    raise RuntimeError(f"could not download {image_record['src']}")


def to_srgb(image):
    """Convert to plain sRGB RGB, applying any embedded colour profile, so no metadata needs to travel."""
    image = ImageOps.exif_transpose(image)
    profile = image.info.get('icc_profile')
    if profile:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(profile))
            image = ImageCms.profileToProfile(image, src, ImageCms.createProfile('sRGB'), outputMode='RGB')
        except (ImageCms.PyCMSError, OSError):
            image = image.convert('RGB')
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image.info.clear()
    return image


def encode(image, fmt, width):
    name, options = ENCODE[fmt]
    budget = next(limit for max_width, limit in sorted(BUDGET.items()) if width <= max_width)
    quality = options['quality']
    while True:
        buffer = io.BytesIO()
        image.save(buffer, name, **{**options, 'quality': quality})
        if buffer.tell() <= budget:
            return buffer.getvalue()
        if quality <= FLOOR[fmt]:
            return None  # too detailed for this width within budget: leave it out, a smaller width serves
        quality = max(FLOOR[fmt], quality - 6)


def widths_for(roles, source_width):
    wanted = sorted({min(ROLES[role], source_width) for role in roles})
    return wanted


def optimize(image_record, slug, check_only=False):
    """Create renditions for one image object; return its `variants` dict (or None when check_only finds gaps)."""
    url = image_record.get('src')
    cache_name = hashlib.sha1(url.encode()).hexdigest()[:16]
    cached = CACHE / cache_name
    if not cached.exists():
        if check_only:
            return None
        CACHE.mkdir(parents=True, exist_ok=True)
        used = download(image_record, cached)
        if used != url:
            print(f'{slug}: original rate-limited; used {used.rsplit("/", 1)[-1]}')
        time.sleep(1.5)
    raw = cached.read_bytes()
    digest = hashlib.sha256(raw + SETTINGS.encode()).hexdigest()[:10]
    image = to_srgb(Image.open(io.BytesIO(raw)))
    folder = OUT / slug
    variants = {'base': f'{PUBLIC_PREFIX}/{slug}/{digest}', 'hash': digest,
                'width': min(image.width, ROLES['full']),
                'height': round(image.height * min(image.width, ROLES['full']) / image.width),
                'color': '#%02x%02x%02x' % image.resize((1, 1), Image.LANCZOS).getpixel((0, 0))}
    for fmt, roles in FORMATS.items():
        existing = {int(p.name.split('-')[1].split('.')[0]) for p in folder.glob(f'{digest}-*.{fmt}')} if folder.exists() else set()
        variants[fmt] = []
        previous = 0
        for width in widths_for(roles, image.width):
            lowest = max(width // 2, previous + 1)  # never fall back to a size a smaller role already uses
            # A rendition that cannot meet its budget at the quality floor is made narrower (down to half)
            # rather than heavier, so every role still has a file within budget.
            attempts = [w for w in (width, round(width * 0.85), round(width * 0.72), round(width * 0.6)) if w >= lowest] or [width]
            made = next((w for w in attempts if w in existing), None)  # a file belongs to the role that would make it
            if made is None:
                if check_only:
                    return None
                folder.mkdir(parents=True, exist_ok=True)
                for attempt in attempts:
                    resized = image if attempt == image.width else image.resize((attempt, round(image.height * attempt / image.width)), Image.LANCZOS)
                    data = encode(resized, fmt, attempt)
                    if data is not None or attempt == attempts[-1]:
                        if data is None:  # still over budget at the narrowest allowed width: keep the floor-quality encoding
                            name, options = ENCODE[fmt]
                            buffer = io.BytesIO(); resized.save(buffer, name, **{**options, 'quality': FLOOR[fmt]}); data = buffer.getvalue()
                        (folder / f'{digest}-{attempt}.{fmt}').write_bytes(data)
                        made = attempt
                        existing.add(attempt)
                        break
            if made not in variants[fmt]:
                variants[fmt].append(made)
            previous = made
    return variants


def main():
    check_only = '--check' in sys.argv
    sites = json.loads(SITES.read_text(encoding='utf-8'))
    done = missing = 0
    for site in sites:
        images = []
        if site.get('image_status') == 'approved' and site.get('coverImage'):
            images.append(site['coverImage'])
        images += [image for image in site.get('galleryImages', [])
                   if image.get('license_status') == 'verified' and image.get('publication_approval', {}).get('status') == 'approved']
        for image in images:
            try:
                variants = optimize(image, site['slug'], check_only)
            except RuntimeError as error:
                print(f"{site['id']}: {error}; run again later", file=sys.stderr)
                variants = None
            if variants is None:
                missing += 1
                continue
            if image.get('variants') != variants:
                image['variants'] = variants
            done += 1
    if check_only:
        print(f'{done} images have every rendition; {missing} need generating')
        return 1 if missing else 0
    if missing:
        print(f'{missing} images could not be downloaded this run; their records are unchanged')
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    stale = {p.parent.name + '/' + p.name.split('-')[0] for p in OUT.rglob('*.*') if not p.name.endswith('.over-budget')} - {
        s['slug'] + '/' + i['variants']['hash'] for s in sites for i in [s.get('coverImage') or {}, *s.get('galleryImages', [])] if i.get('variants')}
    files = [p for p in OUT.rglob('*.*') if not p.name.endswith('.over-budget')]
    size = sum(p.stat().st_size for p in files)
    print(f'{done} images optimized; {len(files)} files, {size / 1e6:.1f} MB in {OUT.relative_to(ROOT)}')
    if stale:
        print(f'{len(stale)} renditions belong to no current image (remove them by hand): {sorted(stale)[:5]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
