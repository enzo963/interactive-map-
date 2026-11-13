"""Primary-image queue: every published card without an approved cover, worked through in batches.

    python3 image_queue.py queue                      # rebuild the ordered queue and its report
    python3 image_queue.py candidates --limit 20 --sheets DIR
                                                      # find candidates for the next pending sites
    python3 image_queue.py decide DECISIONS.json      # record review decisions (approve / flag)

Order. Approved records come first, then important records (UNESCO-related, complexes with
components, strong sources, ancient sites), then the rest; within each band the governorates
with the lowest share of image-complete cards come first, then the more important records.

Identity. A photograph must show the card's own site. Candidates come only from the Wikidata item
of the site itself: an item linked in the card's sources, an item recorded in an earlier review,
or an item found by name and confirmed either by coordinates (within MAX_KM of the card) or, for
cards without coordinates, by an exact name match on an item in Iraq near the card's governorate.
Towns and villages are never accepted for a monument. Candidates are the item's own image (P18)
and the photographs in its Commons category: free licenses only (no NC/ND), at least MIN_SIDE px.

State (data/images/image-queue-state.json), one entry per card:
  pending        not yet searched
  to-review      candidates found; waiting for visual review
  approved       a cover was approved and written by apply_cover_review.py
  flagged        no legally or technically suitable image can currently be found; `reason` says why
Flags are never covers: the card keeps the Heritage Bridge fallback.
"""
import argparse
import datetime
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import gallery_candidates as gc

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SITES = ROOT / 'src' / 'data' / 'sites.json'
CREDIBILITY = ROOT / 'src' / 'data' / 'source-credibility.json'
STATE = BASE / 'data' / 'images' / 'image-queue-state.json'
QUEUE = BASE / 'data' / 'images' / 'image-queue.json'
CANDIDATES = BASE / 'data' / 'images' / 'image-queue-candidates.json'
# Identities confirmed by hand (item and the evidence), consulted before any search.
IDENTITIES = BASE / 'data' / 'images' / 'image-queue-identities.json'
REPORT = ROOT / 'reports' / 'images' / 'image-queue.md'
MAX_KM = 3.0
MIN_SIDE = 800
PER_SITE = 8
CENTRES = {  # governorate capitals, as in src/data/geo/governorateCentres.js
    'Nineveh': (36.34, 43.13), 'Duhok': (36.87, 42.99), 'Erbil': (36.19, 44.01), 'Sulaymaniyah': (35.56, 45.43),
    'Kirkuk': (35.47, 44.39), 'Salah al-Din': (34.6, 43.68), 'Diyala': (33.75, 44.64), 'Baghdad': (33.31, 44.37),
    'Anbar': (33.42, 43.3),
}
SETTLEMENT = {'Q486972', 'Q515', 'Q532', 'Q3957', 'Q1549591', 'Q5119', 'Q1637706', 'Q2039348', 'Q1093829', 'Q15284'}
REASONS = {
    'no-wikidata-item': 'No Wikidata item for the site itself could be identified, so no photograph can be tied to it.',
    'no-free-photograph': 'The site’s item has no freely licensed photograph of usable size (P18 or Commons category).',
    'only-unrelated-images': 'The available free images do not show the site itself (other places, objects, maps or people).',
    'not-recognisable': 'The free photographs are too distant, dark, small or obstructed to recognise the site at card size.',
    'identity-uncertain': 'A free photograph exists, but its own description does not establish that it shows this site.',
}


def load(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def norm(text):
    text = unicodedata.normalize('NFKD', text or '').encode('ascii', 'ignore').decode().lower()
    text = re.sub(r'[\'’‘`ʿʾ]', '', text).replace('-', ' ')  # "Al-Wazir" -> "al wazir", so the article can be dropped
    text = re.sub(r'\b(the|al|el|of|and)\b', ' ', text)
    return ' '.join(re.sub(r'[^a-z0-9 ]', ' ', text).split())


def km(a, b):
    (lat1, lon1), (lat2, lon2) = a, b
    p = math.pi / 180
    h = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def tiers():
    registry = load(CREDIBILITY, {'domains': {}})
    return {domain: tier for tier, domains in registry['domains'].items() for domain in domains}


def best_tier(record, domain_tiers):
    best = 9
    for source in record.get('sources') or []:
        host = re.sub(r'^www\.', '', (re.match(r'https?://([^/]+)', source.get('url') or '') or [None, ''])[1])
        for domain, tier in domain_tiers.items():
            if tier.isdigit() and (host == domain or host.endswith('.' + domain)):
                best = min(best, int(tier))
    return best


def importance(record, components, domain_tiers):
    score, why = 0, []
    if record.get('status') == 'approved':
        score += 100; why.append('approved')
    if record.get('unesco') is True or 'UNESCO' in (record.get('heritage_status') or ''):
        score += 20; why.append('UNESCO')
    if components.get(record['id']):
        score += 5 * min(components[record['id']], 3); why.append(f"{components[record['id']]} components")
    tier = best_tier(record, domain_tiers)
    if tier <= 2:
        score += 10 if tier == 1 else 5; why.append(f'tier {tier} source')
    year = record.get('estimated_year')
    if isinstance(year, (int, float)) and year < 0 or re.search(r'\bBC\b', str(year or '')):
        score += 5; why.append('ancient')
    return score, why


def visible_ids():
    """IDs of the published cards, from the site's own card contract (scripts/visible-card-ids.mjs)."""
    import subprocess
    out = subprocess.run(['node', 'scripts/visible-card-ids.mjs'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return set(json.loads(out))


def build_queue():
    sites = load(SITES, [])
    visible = visible_ids()
    state = load(STATE, {})
    domain_tiers = tiers()
    components = {}
    for record in sites:
        if record.get('parentSite'):
            components[record['parentSite']] = components.get(record['parentSite'], 0) + 1
    published = [r for r in sites if r['id'] in visible]
    rate = {}
    for gov in CENTRES:
        own = [r for r in published if r.get('governorate') == gov]
        rate[gov] = sum(r.get('image_status') == 'approved' for r in own) / max(1, len(own))
    queue = []
    for record in published:
        if record.get('image_status') == 'approved':
            continue
        score, why = importance(record, components, domain_tiers)
        band = 'A' if record.get('status') == 'approved' else 'B' if score >= 10 else 'C'
        entry = state.setdefault(record['id'], {'status': 'pending'})
        queue.append({'id': record['id'], 'name': record['name'], 'governorate': record.get('governorate'), 'category': record.get('category'),
                      'band': band, 'score': score, 'why': why, 'status': entry['status'], 'reason': entry.get('reason', '')})
    queue.sort(key=lambda q: (q['band'], rate.get(q['governorate'], 1), q['governorate'] or '', -q['score'], q['name']))
    for record in sites:  # cards that gained an approved cover leave the queue as approved
        if record.get('image_status') == 'approved' and record['id'] in state and state[record['id']]['status'] != 'approved':
            state[record['id']]['status'] = 'approved'
    save(STATE, state)
    save(QUEUE, queue)
    write_report(published, queue, rate)
    return queue


def write_report(published, queue, rate):
    done = sum(r.get('image_status') == 'approved' for r in published)
    counts = {status: sum(q['status'] == status for q in queue) for status in ('pending', 'to-review', 'flagged')}
    lines = [f'# Primary-image queue — {datetime.date.today().isoformat()}', '',
             f'Image-complete cards: **{done} of {len(published)} ({100 * done / max(1, len(published)):.0f}%)**. '
             f"Queue: {len(queue)} cards — {counts['pending']} not yet searched, {counts['to-review']} with candidates awaiting review, "
             f"{counts['flagged']} flagged with no suitable image.", '',
             'Order: band A approved records, band B important records (UNESCO, complexes, strong sources, ancient sites), band C the rest; '
             'within a band, governorates with the lowest image share first.', '',
             '| # | Band | Governorate | Site | Why it ranks | Status |', '| ---: | --- | --- | --- | --- | --- |']
    for i, q in enumerate(queue, 1):
        status = q['status'] + (f" — {REASONS.get(q['reason'], q['reason'])}" if q['status'] == 'flagged' else '')
        lines.append(f"| {i} | {q['band']} | {q['governorate']} | {q['name']} | {', '.join(q['why']) or '–'} | {status} |")
    lines += ['', '## Image share by governorate (published cards)', '']
    lines += [f'- {gov}: {100 * share:.0f}%' for gov, share in sorted(rate.items(), key=lambda kv: kv[1])]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def source_qids(record):
    found = []
    for source in record.get('sources') or []:
        found += re.findall(r'wikidata\.org/(?:wiki|entity)/(Q\d+)', source.get('url') or '')
    return list(dict.fromkeys(found))


def entities(qids):
    out = {}
    for i in range(0, len(qids), 40):
        data = gc.api(gc.WIKIDATA, action='wbgetentities', ids='|'.join(qids[i:i + 40]), props='claims|labels|aliases|descriptions', languages='en|ar|ckb|ku|de|fr')
        out.update(data.get('entities', {}))
    return out


def claim_values(entity, prop):
    values = []
    for claim in entity.get('claims', {}).get(prop, []):
        value = claim.get('mainsnak', {}).get('datavalue', {}).get('value')
        if isinstance(value, dict) and 'id' in value:
            values.append(value['id'])
        elif value is not None:
            values.append(value)
    return values


def names(entity):
    labels = [label['value'] for label in entity.get('labels', {}).values()]
    labels += [alias['value'] for aliases in entity.get('aliases', {}).values() for alias in aliases]
    return {norm(name) for name in labels if name}


def is_settlement_card(record):
    return bool(re.search(r'\b(city|town|village|urban|district|quarter)\b', record.get('category') or '', re.I))


# Words that name a kind of place, not a particular one: a match needs at least one other word in common.
GENERIC = set('mosque church shrine tomb mausoleum castle citadel market bazaar souk suq house palace tell tepe temple monastery '
              'school madrasa bridge gate minaret tower clock old city great site ruins archaeological cave reliefs relief rock '
              'canal hill mound dome cemetery museum building quarter street square khan baths bath hammam convent cathedral '
              'chaldean syriac orthodox catholic armenian assyrian imam prophet nabi sheikh shaykh mar saint st '
              # place names: two different sites in one city share them, so they never identify a site
              'iraq kurdistan nineveh ninawa mosul duhok dohuk zakho amedi amadiya akre erbil arbil hawler hewler koya shaqlawa '
              'ankawa sulaymaniyah slemani halabja kirkuk salah din tikrit samarra baiji anbar ramadi fallujah anah hit rawa haditha '
              'diyala baqubah khanaqin baghdad kadhimiya adhamiya rusafa karkh'.split())
IRAQ = (29.0, 37.5, 38.7, 48.8)


def tokens(text):
    return set(norm(text).split())


def name_match(record_names, entity):
    """Best overlap between the card's names and the item's labels, or 0 if no distinctive word is shared."""
    best = 0.0
    for label in names(entity):
        b = set(label.split())
        for name in record_names:
            a = tokens(name)
            if not a or not b or not ((a & b) - GENERIC):
                continue
            best = max(best, len(a & b) / len(a | b))
    return best


def in_iraq(entity):
    coords = [(c['latitude'], c['longitude']) for c in claim_values(entity, 'P625') if isinstance(c, dict)]
    if coords:
        return any(IRAQ[0] <= lat <= IRAQ[1] and IRAQ[2] <= lon <= IRAQ[3] for lat, lon in coords)
    return 'Q796' in claim_values(entity, 'P17')  # a description mentioning Iraq is not enough


def nearest_governorate(point):
    return min(CENTRES, key=lambda gov: km(point, CENTRES[gov]))


def card_names(record):
    raw = [record['name']] + list(record.get('alternativeNames') or [])
    out = []
    for name in raw:
        out.append(name)
        out.append(re.sub(r'\s*\(.*?\)', '', name))          # without a parenthesis
        out.append(name.split(',')[0])                          # before a comma ("…, Kirkuk")
        out += re.findall(r'\((.*?)\)', name)                 # the parenthesis itself
    return [n.strip() for n in dict.fromkeys(out) if n and n.strip()]


def resolve_item(record, prior_qid):
    """The Wikidata item of the site itself, with how it was matched, or (None, reason)."""
    manual = load(IDENTITIES, {}).get(record['id'])
    if manual:
        return (manual['qid'], f"confirmed by hand: {manual['note']}") if manual.get('qid') else (None, f"confirmed by hand: {manual['note']}")
    linked = source_qids(record)
    if linked:
        return linked[0], 'linked-in-sources'
    if prior_qid:
        return prior_qid, 'earlier-review'
    names_ = card_names(record)
    point = (record['latitude'], record['longitude']) if isinstance(record.get('latitude'), (int, float)) and isinstance(record.get('longitude'), (int, float)) else None
    approximate = 'approx' in str(record.get('coordinates_precision') or '').lower()
    hits = []
    if point:  # items near the card's position
        radius = 8000 if approximate else int(MAX_KM * 1000)
        data = gc.api(gc.WIKIDATA, action='query', list='geosearch', gscoord=f'{point[0]}|{point[1]}', gsradius=radius, gslimit=50)
        hits += [g['title'] for g in data.get('query', {}).get('geosearch', [])]
    for query in names_[:4]:  # full-text search on the names
        data = gc.api(gc.WIKIDATA, action='query', list='search', srsearch=query, srlimit=8)
        hits += [h['title'] for h in data.get('query', {}).get('search', [])]
    hits = [h for h in dict.fromkeys(hits) if re.fullmatch(r'Q\d+', h)]
    if not hits:
        return None, 'no-search-result'
    found = entities(hits)
    best, best_score, best_how = None, 0.0, ''
    for qid in hits:
        entity = found.get(qid, {})
        if set(claim_values(entity, 'P31')) & SETTLEMENT and not is_settlement_card(record):
            continue
        if not in_iraq(entity):
            continue
        score = name_match(names_, entity)
        coords = [(c['latitude'], c['longitude']) for c in claim_values(entity, 'P625') if isinstance(c, dict)]
        if point and coords:
            distance = min(km(point, c) for c in coords)
            if distance > (8 if approximate else MAX_KM):
                continue
            how = f'name match near the card ({distance:.1f} km)'
            needed = 0.34
        else:
            if coords and not any(nearest_governorate(c) == record.get('governorate') for c in coords):
                continue  # an item with the same name in another governorate is a different place
            how = 'name match of an item in Iraq'
            needed = 0.6  # without coordinates to confirm, the names must agree closely
        if score >= needed and score > best_score:
            best, best_score, best_how = qid, score, how
    return (best, best_how) if best else (None, 'no-confirmed-match')


def place_words(record, sites):
    words = tokens(record.get('governorate') or '') | tokens(record.get('city') or '')
    parent = sites.get(record.get('parentSite') or '')
    if parent:
        words |= tokens(parent['name']) - GENERIC
    if ',' in record['name']:
        words |= tokens(record['name'].split(',')[-1])
    return words - GENERIC


def commons_file_search(record, sites):
    """Photographs whose own title or description names the site (a distinctive word of its name) and its place.
    Used only when the site has no item or its item has no photograph; visual review remains the deciding check."""
    place = place_words(record, sites)
    distinctive = {w for name in card_names(record) for w in tokens(name)} - GENERIC - place
    if not distinctive or not place:
        return []
    query = f"{' '.join(sorted(distinctive))} {' '.join(sorted(place))}"
    data = gc.api(gc.COMMONS, action='query', list='search', srsearch=query, srnamespace=6, srlimit=40)
    titles = [h['title'] for h in data.get('query', {}).get('search', [])]
    infos = gc.file_info(titles) if titles else {}
    out = []
    for title, info in infos.items():
        c = gc.candidate(title, info)
        text = tokens(c['file'] + ' ' + c['description'])
        if info.get('mime') != 'image/jpeg' or not (text & distinctive) or not (text & place):
            continue
        if gc.NOT_A_PHOTO.search(c['file'] + ' ' + c['description']) or gc.IN_A_MUSEUM.search(c['file'] + ' ' + c['description']):
            continue
        out.append(c | {'source': 'commons-file-search'})
    return out


def p18_candidate(entity):
    files = claim_values(entity, 'P18')
    if not files:
        return []
    infos = gc.file_info(['File:' + files[0]])
    return [gc.candidate(title, info) | {'source': 'P18'} for title, info in infos.items()]


def collect_candidates(record, qid, entity, rejected):
    pool = p18_candidate(entity)
    result = gc.collect(record, qid)  # Commons category photographs, already filtered and de-duplicated
    pool += [c | {'source': 'commons-category'} for c in result.get('candidates', [])]
    kept, seen = [], set()
    for c in pool:
        if c['file'] in seen or c['file'] in rejected:
            continue
        seen.add(c['file'])
        license_ok = gc.FREE.match(c['license'] or '') and not re.search(r'\b(NC|ND)\b', c['license'] or '')
        if not license_ok or max(c['width'], c['height']) < MIN_SIDE:
            continue
        if not c.get('thumb'):
            continue
        kept.append(c)
        if len(kept) >= PER_SITE:
            break
    return kept, result.get('category')


def run_candidates(limit, sheets):
    queue = build_queue()
    sites = {r['id']: r for r in load(SITES, [])}
    state = load(STATE, {})
    found_all = load(CANDIDATES, {})
    earlier = {}
    for path in sorted((BASE / 'data' / 'images').glob('cover-review-*.json')):
        for entry in load(path, {}).get('entries', []):
            earlier.setdefault(entry['id'], {'qid': entry.get('qid'), 'rejected': set()})
            if entry.get('decision') == 'rejected':
                earlier[entry['id']]['rejected'].add(entry.get('file'))
    batch = [q for q in queue if q['status'] == 'pending'][:limit]
    rows = []
    for q in batch:
        record = sites[q['id']]
        prior = earlier.get(record['id'], {})
        qid, how = resolve_item(record, prior.get('qid'))
        today = datetime.date.today().isoformat()
        if qid:
            entity = entities([qid]).get(qid, {})
            candidates, category = collect_candidates(record, qid, entity, prior.get('rejected', set()))
        else:
            candidates, category = [], None
        if not candidates:  # no item, or an item without photographs: look for files that name the site and its place
            extra = [c for c in commons_file_search(record, sites)
                     if gc.FREE.match(c['license'] or '') and not re.search(r'\b(NC|ND)\b', c['license'] or '')
                     and max(c['width'], c['height']) >= MIN_SIDE and c.get('thumb')][:PER_SITE]
            if extra:
                candidates, how = extra, (how if qid else 'no Wikidata item') + '; Commons files naming the site and its place'
        if not qid and not candidates:
            state[record['id']] = {'status': 'flagged', 'reason': 'no-wikidata-item', 'detail': how, 'checkedAt': today}
            print(f"{record['id']}: flagged — no item ({how})")
            continue
        if not candidates:
            state[record['id']] = {'status': 'flagged', 'reason': 'no-free-photograph', 'qid': qid, 'matchedBy': how, 'category': category, 'checkedAt': today}
            print(f"{record['id']}: flagged — {qid} has no free photograph")
            continue
        state[record['id']] = {'status': 'to-review', 'qid': qid, 'matchedBy': how, 'category': category, 'checkedAt': today}
        found_all[record['id']] = {'id': record['id'], 'name': record['name'], 'qid': qid, 'matchedBy': how, 'category': category, 'candidates': candidates}
        rows.append(found_all[record['id']])
        print(f"{record['id']}: {qid} ({how}) — {len(candidates)} candidates")
        save(STATE, state)
        save(CANDIDATES, found_all)
    save(STATE, state)
    save(CANDIDATES, found_all)
    if sheets and rows:
        contact_sheets(rows, Path(sheets))
    build_queue()


def preview(url):
    """A thumbnail for the review sheet; unlike the gallery cache it also accepts PNG files."""
    image = gc.thumbnail(url)
    if image is not None:
        return image
    body = gc.fetch(url)
    try:
        return Image.open(__import__('io').BytesIO(body)).convert('RGB') if body else None
    except OSError:
        return None


def contact_sheets(rows, folder):
    folder.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 14)
    cell, label = 250, 40
    for start in range(0, len(rows), 6):
        chunk = rows[start:start + 6]
        sheet = Image.new('RGB', (PER_SITE * cell, len(chunk) * (cell + label + 24)), 'white')
        draw = ImageDraw.Draw(sheet)
        for r, row in enumerate(chunk):
            y = r * (cell + label + 24)
            draw.text((6, y + 4), f"{row['id']} — {row['name']} [{row['qid']}, {row['matchedBy']}]", fill='#a00', font=font)
            for i, c in enumerate(row['candidates']):
                image = preview(c['thumb'])
                if image is None:
                    continue
                image.thumbnail((cell - 6, cell - 6))
                sheet.paste(image, (i * cell + 3, y + 24))
                draw.text((i * cell + 4, y + 24 + cell), f"{i + 1}. {c['source'][:6]} {c['width']}x{c['height']}", fill='black', font=font)
                draw.text((i * cell + 4, y + 24 + cell + 17), f"{c['license'][:18]} {c['file'][:14]}", fill='#555', font=font)
        sheet.save(folder / f'queue-{start // 6 + 1:03d}.jpg', quality=80)


def decide(path):
    """DECISIONS.json: {"reviewedAt": "...", "decisions": [{"id": ..., "approve": <1-based index>, "reason": "..."}
    or {"id": ..., "flag": "<reason key>", "detail": "..."}]}. Approvals are written as a cover review file for
    apply_cover_review.py; flags are recorded in the queue state."""
    decisions = load(Path(path), {})
    found = load(CANDIDATES, {})
    state = load(STATE, {})
    reviewed = decisions['reviewedAt']
    entries = []
    for d in decisions['decisions']:
        row = found[d['id']]
        if 'flag' in d:
            if d['flag'] not in REASONS:
                sys.exit(f"{d['id']}: unknown flag {d['flag']}")
            state[d['id']] = {**state.get(d['id'], {}), 'status': 'flagged', 'reason': d['flag'], 'detail': d.get('detail', ''), 'checkedAt': reviewed}
            continue
        c = row['candidates'][d['approve'] - 1]
        license_name = 'CC0' if c['license'].upper().startswith('CC0') else c['license']
        entries.append({'id': d['id'], 'qid': row['qid'], 'how': f"{row['matchedBy']}; {c['source']}", 'file': c['file'], 'page': c['page'],
                        'url': c['url'], 'thumb': c['url'], 'width': c['width'], 'height': c['height'], 'artist': c['artist'],
                        'credit': c['artist'], 'license': license_name, 'licenseUrl': c['licenseUrl'], 'decision': 'approved',
                        'reason': d.get('reason') or 'Shows the site itself; free license confirmed on Commons.'})
        state[d['id']] = {**state.get(d['id'], {}), 'status': 'approved', 'file': c['file'], 'checkedAt': reviewed}
    out = BASE / 'data' / 'images' / f'cover-review-{reviewed}-queue.json'
    previous = load(out, {'entries': []})
    keep = [e for e in previous['entries'] if e['id'] not in {x['id'] for x in entries}]
    save(out, {'reviewer': 'Claude (Anthropic), visual review of contact sheets', 'reviewedAt': reviewed,
               'method': ('Candidate = the image (P18) or a Commons-category photograph of the card’s own Wikidata item, matched through '
                          'the card’s sources, an earlier review, or a name search confirmed by coordinates or by an exact name in Iraq; '
                          'free licenses only; approved after visual review only when it shows the site itself, recognisably, at card size.'),
               'entries': keep + entries})
    save(STATE, state)
    print(f"{len(entries)} covers to apply ({out.name}); {sum('flag' in d for d in decisions['decisions'])} flagged")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('queue')
    c = sub.add_parser('candidates'); c.add_argument('--limit', type=int, default=20); c.add_argument('--sheets')
    d = sub.add_parser('decide'); d.add_argument('path')
    args = parser.parse_args()
    if args.command == 'queue':
        queue = build_queue(); print(f'{len(queue)} cards in the queue; report: {REPORT.relative_to(ROOT)}')
    elif args.command == 'candidates':
        run_candidates(args.limit, args.sheets)
    else:
        decide(args.path)
