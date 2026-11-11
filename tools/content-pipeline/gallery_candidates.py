"""Collect additional photograph candidates for flagship sites (gallery images beyond the cover).

For each flagship card, the candidates are files in the Wikimedia Commons category of the card's own
Wikidata item (property P373), plus the files of its direct sub-categories: photographs filed under
the site itself, never under its town or region. Each file's license, creator and size come from the
Commons API. A candidate is kept only when it

  - carries a free license (CC0, public domain, CC BY, CC BY-SA; never NC or ND),
  - is a photograph (JPEG) of at least 1200 px on its long side,
  - is not the card's cover, and is not a near-duplicate (difference hash) of the cover or of a
    candidate already kept.

The output (data/images/gallery-candidates-<date>.json) is unreviewed. Every candidate is then
viewed on a labelled contact sheet (written with --sheets to the given folder) and either approved,
with the viewpoint it adds, or rejected, in data/images/gallery-review-<date>.json; see
apply_gallery_review.py.

Usage (from this directory):
    python3 gallery_candidates.py --date 2026-11-09 --sheets /path/to/folder
"""
import argparse
import hashlib
import io
import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SITES = ROOT / 'src' / 'data' / 'sites.json'
CACHE = BASE / 'data' / 'image-cache' / 'gallery-thumbs'
UA = 'HistoryInCards-research/1.0'
COMMONS = 'https://commons.wikimedia.org/w/api.php'
WIKIDATA = 'https://www.wikidata.org/w/api.php'

# Flagship cards: World Heritage properties, the largest archaeological cities, and complexes
# (citadels, monasteries, shrines, palaces) whose plan, interior or setting a single photograph
# cannot show. Wikidata items for cards whose cover predates the identity record are given here.
FLAGSHIPS = {
    'site-001': None,                                   # Hatra (World Heritage)
    'site-erbil-erbil-citadel': None,                   # Erbil Citadel (World Heritage)
    'site-salah-al-din-samarra': None,                  # Samarra (World Heritage)
    'site-salah-al-din-ashur': None,                    # Ashur (World Heritage)
    'site-nineveh-ancient-nineveh': None,
    'site-nineveh-nimrud': None,
    'site-baghdad-ctesiphon': None,
    'site-baghdad-taq-kasra': None,
    'site-baghdad-dur-kurigalzu': None,
    'site-salah-al-din-great-mosque': 'Q593115',
    'site-salah-al-din-abu-dulaf': 'Q22686625',
    'site-salah-al-din-qasr-al-ashiq': None,
    'site-salah-al-din-al-askari-shrine': None,
    'site-baghdad-mustansiriya-madrasa': 'Q15260416',
    'site-baghdad-abbasid-palace': 'Q20669819',
    'site-baghdad-kadhimiya-shrine': None,
    'site-baghdad-abu-hanifa-mosque': None,
    'site-baghdad-khan-mirjan': None,
    'site-baghdad-mutanabbi-street': None,
    'site-baghdad-zumurrud-khatun-mausoleum': None,
    'site-baghdad-al-khulafa-mosque': None,
    'site-baghdad-iraq-museum': None,
    'site-nineveh-al-nouri': None,
    'site-nineveh-lalish': None,
    'site-nineveh-mar-mattai-monastery': None,
    'site-nineveh-rabban-hormizd-monastery': None,
    'site-nineveh-dair-mar-elia': None,
    'site-nineveh-mar-behnam-monastery': None,
    'site-nineveh-jerwan-aqueduct': None,
    'site-nineveh-khinnis-reliefs': None,
    'site-kirkuk-kirkuk-citadel': None,
    'site-erbil-shanidar-cave': None,
    'site-duhok-amedy-city': None,
    'site-duhok-delal-bridge': None,
    'site-sulaymaniyah-qalatga-darband': None,
}
FREE = re.compile(r'^(CC0( 1\.0)?|CC BY(-SA)? \d\.\d( [a-z]{2}| igo)?|Public domain|PD[- ].*|Copyrighted free use|Attribution)$', re.I)
NOT_A_PHOTO = re.compile(r'\b(map|plan|drawing|diagram|sketch|logo|coin|stamp|banknote|seal|engraving|lithograph|painting|illustration|reconstruction|model)\b', re.I)
# Objects from a site now in a museum are artifacts, not views of the site (except on museum cards).
IN_A_MUSEUM = re.compile(r'\bmuseum\b|متحف|\b(BM|VA|AO)\s?\d|Louvre|Pergamon|Vorderasiatisch|Oriental Institute|Metropolitan|\bMET D[PT]'
                         r'|\bfrom (Assur|Ashur|Nimrud|Kalhu|Nineveh|Hatra|Samarra|Khorsabad|Balawat)\b', re.I)
# Military and civic press photographs are scenes of people, not views of the site.
PRESS_SCENE = re.compile(r'\b(soldiers?|troops?|brigade|battalion|platoon|marines?|airmen|patrol|convoy|ribbon|conference|commander|DVIDS\d*|Defense\.gov|Army\.mil)\b', re.I)
MIN_LONG_SIDE = 1200
PER_SITE = 18
SUBCATEGORIES = 12


def fetch(url):
    """Bytes of a URL via curl (the system certificate store; Python's may be missing)."""
    result = subprocess.run(['curl', '-s', '-f', '-L', '-A', UA, '--max-time', '60', url], capture_output=True, check=False)
    return result.stdout if result.returncode == 0 else None


def api(url, **params):
    query = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    for attempt in range(7):
        body = fetch(f'{url}?{query}')
        try:
            return json.loads(body)
        except (TypeError, ValueError):  # rate limit or a transient error: back off, then retry
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f'API request failed: {params}')


def commons_category(qid, follow_topic=True):
    """The item's Commons category: P373, else a Commons category sitelink, else the sitelink of the
    item's main category (P910)."""
    entity = api(WIKIDATA, action='wbgetentities', ids=qid, props='claims|sitelinks')['entities'][qid]
    claims = entity.get('claims', {})
    if claims.get('P373'):
        return claims['P373'][0]['mainsnak']['datavalue']['value']
    link = entity.get('sitelinks', {}).get('commonswiki', {}).get('title', '')
    if link.startswith('Category:'):
        return link[len('Category:'):]
    if follow_topic and claims.get('P910'):
        return commons_category(claims['P910'][0]['mainsnak']['datavalue']['value']['id'], follow_topic=False)
    return None


def members(category, kind):
    out, cont = [], {}
    while True:
        data = api(COMMONS, action='query', list='categorymembers', cmtitle=f'Category:{category}', cmtype=kind, cmlimit=500, **cont)
        out += [m['title'] for m in data['query']['categorymembers']]
        if 'continue' not in data or len(out) >= 1500:
            return out
        cont = data['continue']


def file_info(titles):
    infos = {}
    for i in range(0, len(titles), 15):
        data = api(COMMONS, action='query', titles='|'.join(titles[i:i + 15]), prop='imageinfo',
                   iiprop='url|size|mime|extmetadata', iiurlwidth=330)
        for page in data['query']['pages']:
            if page.get('imageinfo'):
                infos[page['title']] = page['imageinfo'][0]
        time.sleep(1.5)
    return infos


def plain(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


def dhash(image, size=8):
    grey = image.convert('L').resize((size + 1, size), Image.LANCZOS)
    pixels = list(grey.tobytes())
    return sum(1 << i for i in range(size * size) if pixels[(i // size) * (size + 1) + i % size] > pixels[(i // size) * (size + 1) + i % size + 1])


def thumbnail(url):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / hashlib.sha1(url.encode()).hexdigest()  # the full URL: long file names can share a tail
    if not path.exists():
        for attempt in range(4):
            body = fetch(url)
            if body and body[:3] == b'\xff\xd8\xff':
                path.write_bytes(body)
                break
            time.sleep(6 * (attempt + 1))
        else:
            return None
        time.sleep(0.4)
    try:
        return Image.open(path).convert('RGB')
    except OSError:
        return None


def candidate(title, info):
    meta = info.get('extmetadata', {})
    value = lambda key: plain(meta.get(key, {}).get('value', ''))
    license_name = value('LicenseShortName')
    return {
        'file': title[len('File:'):],
        'page': info['descriptionurl'],
        'url': info['url'],
        'thumb': info.get('thumburl', ''),
        'width': info['width'],
        'height': info['height'],
        'artist': value('Artist')[:160] or 'Unknown author',
        'license': 'Public domain' if license_name.lower().startswith(('pd', 'public domain')) else license_name,
        'licenseUrl': value('LicenseUrl'),
        'date': value('DateTimeOriginal')[:40],
        'description': value('ImageDescription')[:300],
    }


def collect(site, qid):
    category = commons_category(qid)
    if not category:
        return {'id': site['id'], 'qid': qid, 'category': None, 'candidates': []}
    titles = members(category, 'file')
    for sub in members(category, 'subcat')[:SUBCATEGORIES]:
        titles += members(sub[len('Category:'):], 'file')
    titles = list(dict.fromkeys(titles))
    infos = file_info(titles)
    cover = site.get('coverImage') or {}
    cover_file = urllib.parse.unquote((cover.get('sourceUrl') or '').rsplit('File:', 1)[-1]).replace('_', ' ')
    is_museum = 'museum' in (site.get('category') or '').lower()
    pool = []
    for title, info in infos.items():
        entry = candidate(title, info)
        if (info.get('mime') != 'image/jpeg' or max(entry['width'], entry['height']) < MIN_LONG_SIDE
                or not FREE.match(entry['license']) or re.search(r'\b(NC|ND)\b', entry['license'])
                or entry['file'] == cover_file or NOT_A_PHOTO.search(entry['file'] + ' ' + entry['description'])
                or (is_museum is False and IN_A_MUSEUM.search(entry['file'] + ' ' + entry['description']))
                or PRESS_SCENE.search(entry['file'] + ' ' + entry['description'])):
            continue
        pool.append(entry)
    # Prefer variety: one file per creator first (largest first), then the rest by size.
    pool.sort(key=lambda e: -e['width'] * e['height'])
    seen_artists, first, rest = set(), [], []
    for entry in pool:
        (rest if entry['artist'] in seen_artists else first).append(entry)
        seen_artists.add(entry['artist'])
    hashes = []
    if cover.get('thumb') or cover.get('src'):
        cover_thumb = cover_url = cover.get('original_url') or cover.get('src')
        match = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons)/(\w)/(\w\w)/([^?]+)', cover_url or '')
        if match:
            root, a, ab, name = match.groups()
            cover_thumb = f'{root}/thumb/{a}/{ab}/{name}/330px-{name}'
        image = thumbnail(cover_thumb) if match else None
        if image:
            hashes.append(dhash(image))
    kept = []
    for entry in first + rest:
        if len(kept) >= PER_SITE:
            break
        image = thumbnail(entry['thumb']) if entry['thumb'] else None
        if image is None:
            continue
        signature = dhash(image)
        if any(bin(signature ^ other).count('1') <= 10 for other in hashes):
            continue  # near-duplicate of the cover or of a kept candidate
        hashes.append(signature)
        entry['orientation'] = 'landscape' if entry['width'] >= entry['height'] else 'portrait'
        kept.append(entry)
    return {'id': site['id'], 'name': site['name'], 'qid': qid, 'category': category,
            'files_in_category': len(titles), 'eligible': len(pool), 'candidates': kept}


def contact_sheet(result, folder):
    if not result['candidates']:
        return
    cell, label, cols = 330, 46, 6
    rows = (len(result['candidates']) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + label) + 40), 'white')
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 15)
    except OSError:
        font = ImageFont.load_default()
    draw.text((8, 10), f"{result['id']} — {result['name']} ({result['category']})", fill='black', font=font)
    for i, entry in enumerate(result['candidates']):
        image = thumbnail(entry['thumb'])
        image.thumbnail((cell - 6, cell - 6))
        x, y = (i % cols) * cell, 40 + (i // cols) * (cell + label)
        sheet.paste(image, (x + 3, y + 3))
        draw.text((x + 4, y + cell), f"{i + 1}. {entry['file'][:40]}", fill='black', font=font)
        draw.text((x + 4, y + cell + 20), f"{entry['width']}x{entry['height']} {entry['license']} {entry['date'][:10]}", fill='#555', font=font)
    folder.mkdir(parents=True, exist_ok=True)
    sheet.save(folder / f"{result['id']}.jpg", quality=82)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', required=True)
    parser.add_argument('--sheets', type=Path, help='folder for the contact sheets')
    parser.add_argument('--only', help='comma-separated card ids')
    args = parser.parse_args()
    sites = {site['id']: site for site in json.loads(SITES.read_text(encoding='utf-8'))}
    out = BASE / 'data' / 'images' / f'gallery-candidates-{args.date}.json'
    previous = json.loads(out.read_text(encoding='utf-8'))['sites'] if out.exists() else []
    results = {result['id']: result for result in previous}
    wanted = args.only.split(',') if args.only else list(FLAGSHIPS)
    for site_id in wanted:
        site = sites[site_id]
        qid = FLAGSHIPS[site_id] or ((site.get('coverImage') or {}).get('identity') or {}).get('item')
        result = collect(site, qid)
        results[site_id] = result
        print(f"{site_id}: {result.get('category')} — {len(result['candidates'])} candidates "
              f"of {result.get('eligible', 0)} eligible / {result.get('files_in_category', 0)} files")
        if args.sheets:
            contact_sheet(result, args.sheets)
        out.write_text(json.dumps({'collectedAt': args.date, 'method': __doc__.split('\n\n')[1].replace('\n', ' '),
                                   'sites': [results[k] for k in FLAGSHIPS if k in results]}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
