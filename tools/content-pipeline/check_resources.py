"""Resource health of every published card, written as a repair queue.

What a published card uses, and how each is checked:
  local renditions   every file listed in an image's `variants` exists under public/, is not empty,
                     decodes, and has the recorded width (images.test.mjs checks the same offline)
  remote images      the original (`src`), shown full size in the viewer: a Wikimedia upload URL is checked
                     through the Commons API (the file exists and its original is still at that path);
                     any other host must answer with an image
  Commons pages      each image's file page (`sourceUrl`) still exists on Wikimedia Commons (API, batched)
  licence links      `license_url` answers
  source links       every `sources[].url` is a valid http(s) URL that answers
  videos             site-videos.json: YouTube oEmbed still returns the video (401/404 = private or removed)
  3D resources       digital-documentation.json: the Sketchfab API still returns the model (404 = removed)

A connection failure never counts as a dead resource: it is not cached, and if a test request to Wikidata
fails at the end of the run the whole run is discarded (exit 2) instead of writing a false queue.

A link that answers 401/403/429 is never retried around the block: it is queued for a manual check in a
browser. Results are cached in data/resources/link-check.json for 7 days (--refresh rechecks everything).
Manual findings go in data/resources/manual-checks.json: { url: { result: "ok"|"dead"|"moved", newUrl?, note, checkedAt } }.

Writes reports/resources/repair-queue.md and data/resources/repair-queue.json.

Usage (from this directory):
    python3 check_resources.py              # check, write the queue; exit 1 if a P1 or P2 item is open
    python3 check_resources.py --refresh    # ignore the cache
"""
import concurrent.futures
import datetime
import json
import re
import subprocess
import sys
import threading
import time
import urllib.parse
from collections import defaultdict
from pathlib import Path

from PIL import Image

import gallery_candidates as gc

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
PUBLIC = ROOT / 'public'
SITES = ROOT / 'src' / 'data' / 'sites.json'
VIDEOS = ROOT / 'src' / 'data' / 'site-videos.json'
DOCS = ROOT / 'src' / 'data' / 'digital-documentation.json'
CACHE = BASE / 'data' / 'resources' / 'link-check.json'
MANUAL = BASE / 'data' / 'resources' / 'manual-checks.json'
QUEUE_JSON = BASE / 'data' / 'resources' / 'repair-queue.json'
QUEUE_MD = ROOT / 'reports' / 'resources' / 'repair-queue.md'
UA = 'HistoryInCards-research/1.0'
TODAY = datetime.date.today().isoformat()
CACHE_DAYS = 7

# Priority: P1 a visitor sees something broken on the card or page; P2 a link a visitor follows is dead;
# P3 a person must look (blocked for automated clients, timeout, or the link moved).
PRIORITY = {
    'no-renditions': 'P1', 'missing-file': 'P1', 'empty-file': 'P1', 'unreadable-image': 'P1', 'wrong-size': 'P1', 'bad-path': 'P1',
    'image-dead': 'P1', 'not-an-image': 'P1', 'video-unavailable': 'P1', 'model-unavailable': 'P1',
    'commons-file-missing': 'P2', 'link-dead': 'P2', 'certificate-error': 'P2', 'connection-reset': 'P3', 'invalid-url': 'P2', 'host-unreachable': 'P2', 'soft-404': 'P2',
    'blocked': 'P3', 'timeout': 'P3', 'server-error': 'P3', 'moved': 'P3', 'media-unchecked': 'P3',
}
ACTIONS = {
    'no-renditions': 'The image has no `variants`: run optimize_images.py for it so the card serves local renditions.',
    'missing-file': 'Re-run optimize_images.py for this image, then commit the files under public/images/sites/.',
    'empty-file': 'Re-run optimize_images.py for this image.',
    'unreadable-image': 'Re-run optimize_images.py for this image; replace the original if it still fails.',
    'wrong-size': 'Re-run optimize_images.py so the rendition matches its recorded width.',
    'bad-path': 'Correct `variants.base` so it points to /images/sites/<slug>/<hash>.',
    'image-dead': 'Find the file again on Commons (it may have been renamed) and update src/original_url, or remove the image.',
    'not-an-image': 'The URL answers but not with an image: update src to the file itself.',
    'video-unavailable': 'Remove the video from site-videos.json or replace it with a current upload by the same publisher.',
    'model-unavailable': 'Remove the resource from digital-documentation.json or link the model\'s new location.',
    'commons-file-missing': 'The Commons file was deleted or renamed: find the new name or remove the image.',
    'link-dead': 'Find the page again (publisher site, Wayback Machine) and update the URL, or replace the source.',
    'invalid-url': 'Correct the URL (scheme, spaces, characters).',
    'certificate-error': 'Browsers warn on this address (certificate for another name or expired): find the address the certificate names and update the link.',
    'connection-reset': 'The server drops automated connections. Open it in a browser from another network; use the archived copy if it is gone.',
    'host-unreachable': 'The site no longer resolves or connects: use an archived copy or another source.',
    'soft-404': 'The link now lands on a home or error page: find the page again or replace the source.',
    'blocked': 'The site refuses automated clients. Open it in a browser; record the result in manual-checks.json.',
    'timeout': 'No answer in time. Open it in a browser; record the result in manual-checks.json.',
    'server-error': 'The server failed. Retry later or open it in a browser; record the result.',
    'moved': 'The link redirects permanently: update it to the new address.',
    'media-unchecked': 'The video or model service did not answer: rerun the check, or open it in a browser.',
}
CANARY = 'https://www.wikidata.org/'


def load(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def visible_ids():
    out = subprocess.run(['node', 'scripts/visible-card-ids.mjs'], cwd=ROOT, capture_output=True, text=True, check=True)
    return set(json.loads(out.stdout))


# ---------- local files ----------

def check_renditions(image):
    """Problems with the local files of one image: [(kind, detail)]."""
    variants = image.get('variants') or {}
    if not variants:
        return [('no-renditions', 'no variants recorded')]
    base = variants.get('base') or ''
    if not re.fullmatch(r'/images/sites/[a-z0-9-]+/[0-9a-f]{10}', base):
        return [('bad-path', f'variants.base "{base}"')]
    problems = []
    for fmt in ('avif', 'webp', 'jpeg'):
        for width in variants.get(fmt) or []:
            path = PUBLIC / f'{base.lstrip("/")}-{width}.{fmt}'
            rel = path.relative_to(ROOT)
            if not path.exists():
                problems.append(('missing-file', str(rel)))
                continue
            if path.stat().st_size == 0:
                problems.append(('empty-file', str(rel)))
                continue
            try:
                with Image.open(path) as img:
                    img.load()
                    if abs(img.width - width) > 1:
                        problems.append(('wrong-size', f'{rel}: {img.width}px, recorded {width}px'))
            except Exception as error:  # noqa: BLE001 - any decoder failure means a broken file
                problems.append(('unreadable-image', f'{rel}: {error.__class__.__name__}'))
    return problems


# ---------- remote links ----------

host_locks = defaultdict(threading.Lock)
host_last = defaultdict(float)


def polite(host):
    """At most one request per host every 1.5 s."""
    gap = 1.5
    with host_locks[host]:
        wait = host_last[host] + gap - time.time()
        if wait > 0:
            time.sleep(wait)
        host_last[host] = time.time()


# Identifier resolvers redirect to the publisher by design; that is not a moved page.
RESOLVERS = {'doi.org', 'dx.doi.org', 'hdl.handle.net', 'n2t.net', 'purl.org', 'ark.bnf.fr'}


def valid_url(url):
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError:
        return False
    return parts.scheme in ('http', 'https') and bool(parts.netloc) and not re.search(r'\s', url)


def probe(url):
    """GET the first bytes (redirects followed). A 429 is honoured: wait as the server asks, then try once more.
    A connection that fails (DNS, refused, timeout) is retried once after 10 s."""
    first = probe_once(url)
    if first['code'] == 429:
        time.sleep(min(max(first.get('retryAfter') or 30, 5), 120))
        return probe_once(url)
    if first['code'] == 0 and first['curl'] in (6, 7, 28, 35, 52, 56):
        time.sleep(10)
        return probe_once(url)
    return first


def probe_once(url):
    """One GET (first bytes only, redirects followed): status, final URL, content type, redirect codes."""
    polite(urllib.parse.urlsplit(url).netloc)
    fmt = '%{http_code}\t%{url_effective}\t%{content_type}\t%{num_redirects}'
    result = subprocess.run(['curl', '-s', '-o', '/dev/null', '-L', '-r', '0-4095', '-A', UA, '--max-time', '25',
                             '--max-redirs', '8', '-w', fmt, '-D', '-', url], capture_output=True, text=True, check=False)
    headers, _, tail = result.stdout.rpartition('\n')
    tail = tail if tail.count('\t') == 3 else result.stdout.strip().split('\n')[-1]
    try:
        code, final, ctype, redirects = tail.split('\t')
    except ValueError:
        code, final, ctype, redirects = '000', url, '', '0'
    permanent = bool(re.search(r'^HTTP/\S+ 30[18]', headers, re.M))
    retry = re.search(r'^retry-after:\s*(\d+)', headers, re.M | re.I)
    return {'code': int(code or 0), 'final': final, 'type': ctype, 'redirects': int(redirects or 0),
            'permanent': permanent, 'curl': result.returncode, 'checkedAt': TODAY,
            'retryAfter': int(retry.group(1)) if retry else None}


def classify(url, result, expect_image=False):
    """Problem kind for a probe result, or None when the link works."""
    code = result['code']
    if result['curl'] in (6, 7):
        return 'host-unreachable'
    if result['curl'] in (51, 58, 60):
        return 'certificate-error'
    if result['curl'] in (35, 52, 56) and code == 0:
        return 'connection-reset'
    if result['curl'] == 28 and code == 0:
        return 'timeout'
    if code in (401, 403, 429, 999):
        return 'blocked'
    if code in (404, 410):
        return 'image-dead' if expect_image else 'link-dead'
    if code >= 500:
        return 'server-error'
    if code == 0:
        return 'host-unreachable'
    if 200 <= code < 300:
        if expect_image and not result['type'].startswith('image/'):
            return 'not-an-image'
        original, final = urllib.parse.urlsplit(url), urllib.parse.urlsplit(result['final'])
        if result['redirects'] and original.path.strip('/') and final.path.strip('/') == '':
            return 'soft-404'
        if re.search(r'(^|[/_-])(404|not-?found|error)([/_.-]|$)', final.path, re.I) and not re.search(r'404|not-?found|error', original.path, re.I):
            return 'soft-404'
        bare = lambda host: host.lower().removeprefix('www.')  # noqa: E731 - adding or dropping www is not a move
        if result['permanent'] and bare(final.netloc) != bare(original.netloc) and original.netloc not in RESOLVERS:
            return 'moved'
        return None
    return 'link-dead'


def wayback(url):
    """Closest archived copy of a URL (Internet Archive availability API), or ''."""
    out = subprocess.run(['curl', '-s', '-A', UA, '--max-time', '30',
                          'https://archive.org/wayback/available?url=' + urllib.parse.quote(url, safe='')],
                         capture_output=True, text=True, check=False).stdout
    try:
        snap = json.loads(out).get('archived_snapshots', {}).get('closest')
    except ValueError:
        return ''
    return snap['url'].replace('http://web.archive.org', 'https://web.archive.org') if snap and snap.get('available') else ''


def network_ok():
    """True when a test request to Wikidata succeeds within three tries (a single blip is not an outage)."""
    for wait in (0, 5, 15):
        time.sleep(wait)
        if probe_once(CANARY)['code'] == 200:
            return True
    return False


def media_status(url):
    """'ok', 'gone' (the service says private or removed) or 'unknown' (no clear answer)."""
    result = probe(url)
    if 200 <= result['code'] < 300:
        return 'ok'
    if result['code'] in (401, 403, 404, 410):
        return 'gone'
    return 'unknown'


def cacheable(result):
    return result['curl'] == 0 and result['code'] not in (0, 429)


def commons_file(url):
    """The Commons file title a URL refers to: a file page or an upload.wikimedia.org original or thumbnail."""
    path = urllib.parse.unquote(urllib.parse.urlsplit(url).path)
    match = re.search(r'commons\.wikimedia\.org/wiki/(File:[^?#]+)', url)
    if match:
        return urllib.parse.unquote(match.group(1)).replace('_', ' ')
    if urllib.parse.urlsplit(url).netloc == 'upload.wikimedia.org':
        match = re.search(r'/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/]+)', path)
        if match:
            return 'File:' + match.group(1).replace('_', ' ')
    return None


def commons_missing(urls):
    """Commons links whose file no longer exists at that address, checked through the API in batches of 50
    instead of a request per file. An upload.wikimedia.org link also needs the file's current original to
    sit at the same path (a renamed file moves its upload URL)."""
    by_title = defaultdict(list)
    for url in urls:
        title = commons_file(url)
        if title:
            by_title[title].append(url)
    missing = set()
    names = sorted(by_title)
    for i in range(0, len(names), 50):
        data = gc.api('https://commons.wikimedia.org/w/api.php', action='query', titles='|'.join(names[i:i + 50]),
                      prop='imageinfo', iiprop='url')
        back = {n['to']: n['from'] for n in data.get('query', {}).get('normalized', [])}
        for page in data.get('query', {}).get('pages', []):
            title = back.get(page['title'], page['title'])
            info = (page.get('imageinfo') or [{}])[0]
            original = urllib.parse.unquote(urllib.parse.urlsplit(info.get('url', '')).path)
            for url in by_title.get(title, []):
                if page.get('missing') or page.get('invalid') or not original:
                    missing.add(url)
                elif urllib.parse.urlsplit(url).netloc == 'upload.wikimedia.org':
                    # thumb/a/ab/Name.jpg/1280px-Name.jpg and a/ab/Name.jpg both point at /a/ab/Name.jpg
                    path = urllib.parse.unquote(urllib.parse.urlsplit(url).path).replace('/thumb/', '/')
                    if not path.startswith(original):
                        missing.add(url)
    return missing, {url for urls_ in by_title.values() for url in urls_}


# ---------- main ----------

def main():
    refresh = '--refresh' in sys.argv
    if not network_ok():
        print('No network: nothing checked.')
        return 2
    published = visible_ids()
    records = [r for r in json.loads(SITES.read_text(encoding='utf-8')) if r['id'] in published]
    cache = {} if refresh else load(CACHE, {})
    manual = load(MANUAL, {'about': '', 'checks': {}})['checks']
    items = []  # {priority, kind, siteId, field, url_or_path, detail}

    def add(kind, site_id, field, target, detail=''):
        items.append({'priority': PRIORITY[kind], 'kind': kind, 'siteId': site_id, 'field': field,
                      'target': target, 'detail': detail, 'action': ACTIONS[kind]})

    links = []  # (site_id, field, url, expect_image)
    images = 0
    for record in records:
        shown = ([('coverImage', record['coverImage'])] if record.get('coverImage') else []) + \
            [(f'galleryImages[{i}]', img) for i, img in enumerate(record.get('galleryImages') or [])]
        for field, image in shown:
            images += 1
            for kind, detail in check_renditions(image):
                add(kind, record['id'], f'{field}.variants', detail.split(':')[0], detail)
            links.append((record['id'], f'{field}.src', image.get('src') or '', True))
            if image.get('sourceUrl'):
                links.append((record['id'], f'{field}.sourceUrl', image['sourceUrl'], False))
            if image.get('license_url'):
                links.append((record['id'], f'{field}.license_url', image['license_url'], False))
        for i, source in enumerate(record.get('sources') or []):
            links.append((record['id'], f'sources[{i}].url', source.get('url') or '', False))

    # Commons file pages: one batched API check instead of a request per page.
    # Commons file pages and Wikimedia originals: one batched API check instead of a request per file.
    missing_files, commons_pages = commons_missing([url for _, _, url, _ in links])
    for site_id, field, url, expect_image in links:
        if url in missing_files:
            add('image-dead' if expect_image else 'commons-file-missing', site_id, field, url, 'not on Commons at this address')

    to_probe = sorted({url for _, field, url, _ in links if valid_url(url) and url not in commons_pages
                       and not (url in cache and cache[url]['code'] != 429 and (datetime.date.fromisoformat(TODAY) - datetime.date.fromisoformat(cache[url]['checkedAt'])).days < CACHE_DAYS)})
    print(f'{len(records)} published cards, {images} images, {len(links)} links; probing {len(to_probe)} URLs '
          f'({len(set(u for _, _, u, _ in links)) - len(to_probe)} cached or checked through the Commons API).', flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for n, (url, result) in enumerate(zip(to_probe, pool.map(probe, to_probe)), 1):
            cache[url] = result if cacheable(result) else {**result, 'checkedAt': '1970-01-01'}
            if n % 100 == 0:
                print(f'  {n}/{len(to_probe)}', flush=True)
                CACHE.parent.mkdir(parents=True, exist_ok=True)
                CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True) + '\n', encoding='utf-8')
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True) + '\n', encoding='utf-8')

    for site_id, field, url, expect_image in links:
        if url in commons_pages:
            continue
        if not valid_url(url):
            add('invalid-url', site_id, field, url or '(empty)')
            continue
        decided = manual.get(url)
        if decided and decided['result'] == 'ok':
            continue
        if decided and decided['result'] in ('dead', 'moved'):
            add('link-dead' if decided['result'] == 'dead' else 'moved', site_id, field, url,
                f"manual check {decided['checkedAt']}: {decided.get('note', '')}" + (f" → {decided['newUrl']}" if decided.get('newUrl') else ''))
            continue
        kind = classify(url, cache[url], expect_image)
        if kind:
            result = cache[url]
            detail = f"HTTP {result['code']}" if result['code'] else f"curl {result['curl']}"
            detail += f" → {result['final']}" if result['final'] != url and result['code'] else ''
            if kind in ('link-dead', 'host-unreachable', 'soft-404', 'connection-reset', 'image-dead'):
                if 'wayback' not in result:
                    result['wayback'] = wayback(url)
                if result['wayback']:
                    detail += f"; archived copy: {result['wayback']}"
            add(kind, site_id, field, url, detail)

    # Videos and 3D resources linked to published cards.
    for video in json.loads(VIDEOS.read_text(encoding='utf-8'))['videos']:
        linked = [s['siteId'] for s in video['sites'] if s['siteId'] in published]
        if not linked:
            continue
        status = media_status('https://www.youtube.com/oembed?' + urllib.parse.urlencode({'url': video['url'], 'format': 'json'}))
        for site_id in linked if status != 'ok' else []:
            add('video-unavailable' if status == 'gone' else 'media-unchecked', site_id, 'site-videos.json', video['url'], video['title'])
    for resource in json.loads(DOCS.read_text(encoding='utf-8'))['resources']:
        linked = [s['siteId'] for s in resource['sites'] if s['siteId'] in published]
        if not linked or resource.get('provider') != 'sketchfab':
            continue
        status = media_status(f"https://api.sketchfab.com/v3/models/{resource['modelId']}")
        for site_id in linked if status != 'ok' else []:
            add('model-unavailable' if status == 'gone' else 'media-unchecked', site_id, 'digital-documentation.json', resource['url'], resource['title'])

    if not network_ok():
        print('The network failed during the run: results discarded, queue not written. Run again.')
        return 2

    write(items, records, images, len(links))
    open_items = [item for item in items if item['priority'] in ('P1', 'P2')]
    return 1 if open_items else 0


def write(items, records, images, link_count):
    order = {'P1': 0, 'P2': 1, 'P3': 2}
    items.sort(key=lambda item: (order[item['priority']], item['kind'], item['siteId'], item['field']))
    names = {r['id']: r['name'] for r in records}
    QUEUE_JSON.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_JSON.write_text(json.dumps({'checkedAt': TODAY, 'cards': len(records), 'images': images, 'links': link_count,
                                      'items': items}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = defaultdict(int)
    for item in items:
        counts[(item['priority'], item['kind'])] += 1
    lines = [
        '# Resource repair queue', '',
        f'Generated {TODAY} by `python3 tools/content-pipeline/check_resources.py`. '
        f'{len(records)} published cards, {images} images (local renditions and remote originals), {link_count} links, '
        'plus every linked video and 3D resource. Full list: `tools/content-pipeline/data/resources/repair-queue.json`.', '',
        '- **P1** a visitor sees something broken (missing or corrupt image file, dead image, unavailable video or model).',
        '- **P2** a link a visitor follows is dead (source, Commons page, licence).',
        '- **P3** a person must look: the site blocks automated clients, timed out, or moved the page. '
        'Record the result in `data/resources/manual-checks.json`.', '',
        '| Priority | Problem | Items | What to do |', '|---|---|---|---|',
    ]
    for (priority, kind), n in sorted(counts.items(), key=lambda kv: (order[kv[0][0]], -kv[1])):
        lines.append(f'| {priority} | {kind} | {n} | {ACTIONS[kind]} |')
    if not items:
        lines.append('| – | none | 0 | Nothing to repair. |')
    for priority in ('P1', 'P2', 'P3'):
        group = [item for item in items if item['priority'] == priority]
        if not group:
            continue
        lines += ['', f'## {priority} ({len(group)})', '', '| Card | Field | Problem | Resource | Detail |', '|---|---|---|---|---|']
        for item in group:
            lines.append(f"| `{item['siteId']}` {names.get(item['siteId'], '')} | {item['field']} | {item['kind']} | {item['target']} | {item['detail']} |")
    QUEUE_MD.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f"{len(items)} items: " + ', '.join(f'{p} {sum(1 for i in items if i["priority"] == p)}' for p in ('P1', 'P2', 'P3')))


if __name__ == '__main__':
    sys.exit(main())
