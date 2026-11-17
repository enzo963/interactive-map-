"""Identity audit of src/data/sites.json: duplicate cards, one place recorded twice, wrong governorates and
information copied from one card to another. It reports candidates only; a person decides.

Pair checks (settled in data/site-identity-decisions.json with merge, component or distinct):
  name          same or alternative name in one governorate, a shared Wikidata site item, or a shared
                primary source (hb_pipeline.duplicates.detect_possible_duplicates)
  similar-name  names at least 90 % alike, in any governorate (a second card under another governorate)
  same-place    two site-precision positions less than 100 m apart
  same-item     the same Wikidata item behind both positions, or behind both cover images
  reused-text   two specific descriptions at least 80 % alike (shared survey templates are reported apart)

Record checks (settled in data/identity/record-decisions.json with keep or fixed, and a note):
  other-governorate   the description or location names a town of another governorate and none of its own
  describes-other     the description names another card's site and not the card's own name
  id-governorate      the record ID's governorate part differs from its governorate
  parent-missing      the heritage status names the site it belongs to, but parentSite does not link it

Usage (from this directory):
    python3 audit_identity.py     # write reports/identity/identity-audit.md; exit 1 if anything is undecided
"""
import datetime
import json
import math
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher
from itertools import combinations
from pathlib import Path

from hb_pipeline.duplicates import detect_possible_duplicates
from hb_pipeline.site_identity import normalize_name
from hb_pipeline.site_merge import decision_pairs

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SITES = ROOT / 'src' / 'data' / 'sites.json'
PAIR_DECISIONS = BASE / 'data' / 'site-identity-decisions.json'
RECORD_DECISIONS = BASE / 'data' / 'identity' / 'record-decisions.json'
OUT_JSON = BASE / 'data' / 'identity' / 'identity-audit.json'
OUT_MD = ROOT / 'reports' / 'identity' / 'identity-audit.md'
TODAY = datetime.date.today().isoformat()

GOV_SLUG = {'Nineveh': 'nineveh', 'Duhok': 'duhok', 'Erbil': 'erbil', 'Sulaymaniyah': 'sulaymaniyah', 'Kirkuk': 'kirkuk',
            'Salah al-Din': 'salah-al-din', 'Diyala': 'diyala', 'Baghdad': 'baghdad', 'Anbar': 'anbar'}

# Towns whose governorate is not in dispute. Places on contested boundaries (Makhmur, Bardarash, Shekhan,
# Tuz Khurmatu, Kifri, Sinjar's northern villages) are left out on purpose: naming them proves nothing.
TOWNS = {
    'Nineveh': ['Mosul', 'Tal Afar', 'Tel Afar', 'Qaraqosh', 'Bakhdida', 'Baghdede', 'Bartella', 'Bashiqa', 'Bahzani',
                'Alqosh', 'Tel Keppe', 'Tel Kaif', 'Hatra', 'Nimrud', 'Khorsabad', 'Hammam al-Alil', 'Qayyarah', 'Rabia'],
    'Duhok': ['Duhok', 'Dohuk', 'Zakho', 'Amedi', 'Amadiya', 'Amadiyah', 'Akre', 'Aqrah', 'Aqra', 'Simele', 'Sumel', 'Bamarni'],
    'Erbil': ['Erbil', 'Arbil', 'Hawler', 'Koya', 'Koysinjaq', 'Shaqlawa', 'Soran', 'Rawanduz', 'Ankawa', 'Choman',
              'Mergasur', 'Harir', 'Diana', 'Khabat'],
    'Sulaymaniyah': ['Sulaymaniyah', 'Slemani', 'Halabja', 'Ranya', 'Rania', 'Penjwen', 'Chamchamal', 'Darbandikhan',
                     'Qaladiza', 'Said Sadiq', 'Sharazur', 'Shahrizor', 'Dukan', 'Pshdar'],
    'Kirkuk': ['Kirkuk', 'Daquq', 'Hawija', 'Altun Kupri', 'Dibis'],
    'Salah al-Din': ['Tikrit', 'Samarra', 'Baiji', 'Bayji', 'Balad', 'Dujail', 'Shirqat', 'Sherqat', 'Ishaqi', 'Al-Dur'],
    'Diyala': ['Baqubah', 'Baquba', 'Khanaqin', 'Muqdadiyah', 'Mandali', 'Balad Ruz', 'Jalawla', 'Khalis', 'Hamrin'],
    'Baghdad': ['Baghdad', 'Kadhimiya', 'Adhamiya', 'Karkh', 'Rusafa', 'Salman Pak', 'Abu Ghraib', 'Taji', 'Mahmudiya'],
    'Anbar': ['Ramadi', 'Fallujah', 'Falluja', 'Hit', 'Haditha', 'Anah', 'Rawa', 'Al-Qaim', 'Rutba', 'Habbaniyah', 'Saqlawiyah'],
}
TOWN_RE = {gov: re.compile(r'\b(' + '|'.join(re.escape(t) for t in towns) + r')\b') for gov, towns in TOWNS.items()}
# A town named only to give a distance or direction ("40 km north of Mosul") does not place the site there.
RELATIVE = re.compile(r'(\d+\s*km|kilometres?|miles?|north|south|east|west|road|border|between|from|towards?|near)\W+(?:\w+\W+){0,3}$', re.I)
# Words every name of a kind shares: names are compared without them ("al-Barani Mosque" is not "al-Sarai Mosque").
GENERIC = set('al el the of and mosque masjid jami church cathedral monastery dair deir shrine tomb mausoleum tell tel tal tepe '
              'gird girdi castle citadel qala palace qasr gate bab house beit bayt market souq bazaar khan bridge temple '
              'mar mart saint st sheikh shaykh imam nabi prophet great old site ruins'.split())
TEMPLATE = re.compile(r'\b(recorded by|named on|known only from|cited in|named in|documented in|investigated by)\b', re.I)


def load(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def km(a, b):
    rad = math.pi / 180
    h = math.sin((b[0] - a[0]) * rad / 2) ** 2 + math.cos(a[0] * rad) * math.cos(b[0] * rad) * math.sin((b[1] - a[1]) * rad / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def family(a, b):
    return a.get('parentSite') == b['id'] or b.get('parentSite') == a['id'] or (a.get('parentSite') and a.get('parentSite') == b.get('parentSite'))


def names(record):
    return [n for n in [record['name'], *(record.get('alternativeNames') or [])] if normalize_name(n)]


def text_norm(value):
    return ' '.join(normalize_name(value).split())


def pair_findings(records):
    found = defaultdict(lambda: {'checks': set(), 'details': []})

    def add(a, b, check, detail):
        key = tuple(sorted((a['id'], b['id'])))
        found[key]['checks'].add(check)
        found[key]['details'].append(detail)

    for pair in detect_possible_duplicates(records):
        if pair['confidence'] == 'low':
            continue
        a, b = records[pair['left_index']], records[pair['right_index']]
        add(a, b, 'name', ', '.join(pair['reasons']) + (f" ({pair['relation']})" if pair['relation'] else ''))

    point = lambda r: (r['latitude'], r['longitude'])  # noqa: E731
    sited = [r for r in records if r.get('coordinates_precision') == 'site' and isinstance(r.get('latitude'), (int, float))]
    for a, b in combinations(sited, 2):
        distance = km(point(a), point(b))
        if distance < 0.1 and not family(a, b):
            add(a, b, 'same-place', f'positions {distance * 1000:.0f} m apart')

    items = defaultdict(list)
    for r in records:
        for item in {(r.get('coordinates_source') or '') if r.get('coordinates_precision') == 'site' else '',
                     ((r.get('coverImage') or {}).get('identity') or {}).get('item') or ''} - {''}:
            items[item.replace('wikidata:', '')].append(r)
    for item, group in items.items():
        for a, b in combinations(group, 2):
            if a['id'] != b['id'] and not family(a, b):
                add(a, b, 'same-item', f'both use Wikidata {item}')

    distinctive = lambda n: ' '.join(w for w in text_norm(n).split() if w not in GENERIC)  # noqa: E731
    prepared = [(r, {distinctive(n) for n in names(r)} - {''}) for r in records]
    for (a, an), (b, bn) in combinations(prepared, 2):
        if family(a, b) or an & bn:
            continue
        best = max(((SequenceMatcher(None, x, y, autojunk=False).ratio(), x, y)
                    for x in an for y in bn if min(len(x), len(y)) >= 6), default=(0, '', ''))
        if best[0] >= 0.9:
            add(a, b, 'similar-name', f'"{best[1]}" ~ "{best[2]}" ({best[0]:.2f})' + ('' if a['governorate'] == b['governorate'] else f"; {a['governorate']} / {b['governorate']}"))

    shared_text = defaultdict(list)
    for r in records:
        shared_text[text_norm(r['description'])].append(r['id'])
    templates = {text for text, ids in shared_text.items() if len(ids) > 1}
    specific = [(r, text_norm(r['description'])) for r in records
                if text_norm(r['description']) not in templates and not TEMPLATE.search(r['description'])]
    for (a, ta), (b, tb) in combinations(specific, 2):
        if family(a, b) or abs(len(ta) - len(tb)) > 0.3 * max(len(ta), len(tb)):
            continue
        matcher = SequenceMatcher(None, ta, tb, autojunk=False)
        if matcher.quick_ratio() >= 0.8 and matcher.ratio() >= 0.8:
            add(a, b, 'reused-text', f'descriptions {matcher.ratio():.0%} alike')
    return found, {text: ids for text, ids in shared_text.items() if len(ids) > 1}


def record_findings(records):
    found = defaultdict(list)
    ids = {r['id'] for r in records}
    by_gov_names = defaultdict(list)
    for r in records:
        for n in names(r):
            if len(text_norm(n)) >= 8:
                by_gov_names[r['governorate']].append((text_norm(n), r))
    for r in records:
        slug = r['id'].split('-')[1:]
        expected = GOV_SLUG.get(r['governorate'], '')
        if r['id'] != 'site-001' and not '-'.join(slug).startswith(expected + '-'):
            found[r['id']].append(('id-governorate', f"ID does not start with site-{expected}-"))
        place_text = ' '.join(filter(None, [r['description'], r.get('approximateLocation') or '']))
        own = TOWN_RE.get(r['governorate'])
        own_named = bool(own and own.search(place_text + ' ' + ' '.join(names(r))))
        if not own_named:
            for gov, pattern in TOWN_RE.items():
                if gov == r['governorate']:
                    continue
                for match in pattern.finditer(place_text):
                    if RELATIVE.search(place_text[:match.start()]) or place_text[match.end():].startswith((' Dam', ' uprising', ' road')):
                        continue
                    found[r['id']].append(('other-governorate', f'names {match.group(1)} ({gov}), not a town of {r["governorate"]}'))
                    break
        status = r.get('heritage_status') or ''
        named = re.search(r'\b(site-[a-z0-9-]+)', status)
        if named and named.group(1) != r['id'] and named.group(1) in ids and r.get('parentSite') != named.group(1):
            found[r['id']].append(('parent-missing', f'heritage status names {named.group(1)}; parentSite is {r.get("parentSite")}'))
        description = text_norm(r['description'])
        own_words = {w for n in names(r) for w in text_norm(n).split() if len(w) > 3}
        if own_words and not any(w in description for w in own_words):
            for other_name, other in by_gov_names[r['governorate']]:
                if other['id'] != r['id'] and not family(r, other) and re.search(r'\b' + re.escape(other_name) + r'\b', description):
                    found[r['id']].append(('describes-other', f'names "{other_name}" ({other["id"]}) but none of its own names'))
                    break
    return found


def main():
    records = json.loads(SITES.read_text(encoding='utf-8'))
    settled = decision_pairs(load(PAIR_DECISIONS, {'decisions': []})['decisions'])
    record_decisions = load(RECORD_DECISIONS, {'decisions': {}})['decisions']
    pairs, shared = pair_findings(records)
    singles = record_findings(records)
    by_id = {r['id']: r for r in records}

    pair_rows = [{'ids': list(key), 'checks': sorted(v['checks']), 'details': v['details'],
                  'decided': frozenset(key) in settled} for key, v in sorted(pairs.items())]
    record_rows = [{'id': rid, 'check': check, 'detail': detail,
                    'decision': (record_decisions.get(rid, {}).get(check) or {}).get('action')}
                   for rid, items in sorted(singles.items()) for check, detail in items]
    template_rows = sorted(({'cards': len(ids), 'text': by_id[ids[0]]['description'], 'ids': ids} for ids in shared.values()),
                           key=lambda row: -row['cards'])

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({'checkedAt': TODAY, 'records': len(records), 'pairs': pair_rows, 'recordChecks': record_rows,
                                    'sharedDescriptions': template_rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    open_pairs = [row for row in pair_rows if not row['decided']]
    open_records = [row for row in record_rows if not row['decision']]
    name = lambda rid: by_id[rid]['name'] if rid in by_id else rid  # noqa: E731
    lines = ['# Identity audit', '',
             f'Generated {TODAY} by `python3 tools/content-pipeline/audit_identity.py` over {len(records)} records. '
             'Candidates only: a person decides each one.', '',
             f'- Pairs: {len(pair_rows)} found, {len(open_pairs)} undecided (decide in `data/site-identity-decisions.json`: merge, component or distinct).',
             f'- Record checks: {len(record_rows)} found, {len(open_records)} undecided (decide in `data/identity/record-decisions.json`: keep or fixed).',
             f'- Shared descriptions: {len(template_rows)} texts used by {sum(r["cards"] for r in template_rows)} cards (not errors; enrich when sources allow).', '']
    if open_pairs:
        lines += ['## Undecided pairs', '', '| Cards | Checks | Detail |', '|---|---|---|']
        lines += [f"| `{a}` {name(a)} · `{b}` {name(b)} | {', '.join(row['checks'])} | {'; '.join(row['details'])} |" for row in open_pairs for a, b in [row['ids']]]
        lines.append('')
    if open_records:
        lines += ['## Undecided record checks', '', '| Card | Check | Detail |', '|---|---|---|']
        lines += [f"| `{row['id']}` {name(row['id'])} | {row['check']} | {row['detail']} |" for row in open_records]
        lines.append('')
    lines += ['## Decided', '', f'{len(pair_rows) - len(open_pairs)} pairs and {len(record_rows) - len(open_records)} record checks have a recorded decision.', '',
              '## Shared descriptions', '', '| Cards | Text |', '|---|---|']
    lines += [f"| {row['cards']} | {row['text']} |" for row in template_rows]
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'{len(pair_rows)} pairs ({len(open_pairs)} undecided), {len(record_rows)} record checks ({len(open_records)} undecided), '
          f'{len(template_rows)} shared descriptions.')
    return 1 if open_pairs or open_records else 0


if __name__ == '__main__':
    sys.exit(main())
