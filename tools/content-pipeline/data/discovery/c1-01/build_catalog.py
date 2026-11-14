"""Assemble the C1-01 research exports. Standard library only; no publishing."""
import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
GOVERNORATES = ['Erbil', 'Duhok', 'Ninewa', 'Sulaymaniyah', 'Kirkuk', 'Anbar', 'Baghdad', 'Salah al-Din', 'Diyala']
CATEGORIES = set('archaeological-tell ancient-city citadel castle-fortress church monastery mosque shrine historic-building historic-district bridge gate-wall palace caravanserai cemetery cave-rock-shelter monument archaeological-site other'.split())
DATE = '2026-11-02'


def norm(value):
    return re.sub(r'[^\w]+', '', unicodedata.normalize('NFKD', value).casefold())


def uid(prefix, value):
    return prefix + hashlib.sha256(value.encode('utf-8')).hexdigest()[:12]


def write(name, data):
    (ROOT / name).write_bytes((json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


records, quarantine, merges = [], [], []
for part in sorted((ROOT / 'parts').glob('*.json')):
    for original in json.loads(part.read_text(encoding='utf-8-sig')):
        r = dict(original)
        r['originFile'] = 'parts/' + part.name
        r['id'] = uid('c1-', r['governorate'] + '|' + r['name'])
        r['discoveryDate'] = DATE
        if r['name'] in ('Bakr Awa', 'Gurga Chiya'):
            r['disposition'] = 'outside-target-governorates' if r['name'] == 'Bakr Awa' else 'hold-for-current-boundary-review'
            r['assignedGovernorateInHistoricalSource'] = r['governorate']
            r['governorate'] = 'Halabja' if r['name'] == 'Bakr Awa' else None
            r['reviewReason'] = ('University of Warsaw 2017 report explicitly places Bakr Awa in Halabja Province, outside the nine targets.' if r['name'] == 'Bakr Awa' else 'Near Halabja; historical Sulaymaniyah assignment cannot establish the current governorate.')
            if r['name'] == 'Bakr Awa':
                r['sources'].append(dict(url='https://www.anthropology.uw.edu.pl/11/bne-11-03.pdf', title='Human remains from Bakr Awa, Iraqi Kurdistan, 2017', institution='University of Warsaw / Bioarchaeology of the Near East 11', sourceType='academic-publication', accessLevel='search-snippet', locator='p. 63 opening paragraph', supports=['governorate']))
            quarantine.append(r)
            continue
        notes = r.get('notes', '')
        flags = []
        if re.search(r'boundar|provincial|province.*review|governorate.*(infer|review)|administrative.*review', notes, re.I):
            flags.append('current-governorate-review')
        if any(s['accessLevel'] in ('search-snippet', 'published-extract') for s in r['sources']):
            flags.append('limited-source-access')
        if re.search(r'alias|identity|equival|same site|duplicate|conflat', notes, re.I):
            flags.append('identity-review')
        if re.search(r'locality unresolved|locality requires review|precise locality unresolved', r['approximateLocation'], re.I):
            flags.append('locality-unresolved')
        if re.search(r'parentSite:|component|part of|complex includes', notes, re.I):
            flags.append('parent-component-review')
        if re.search(r'reservoir|submerg|inundat|relocat|destroy|demolish|rebuil', notes, re.I):
            flags.append('survival-or-reconstruction-review')
        r['governorateStatus'] = 'provisional-boundary-review' if 'current-governorate-review' in flags else 'source-assigned-not-independently-verified'
        r['reviewFlags'] = flags
        r['sourceAccessSummary'] = sorted(set(s['accessLevel'] for s in r['sources']))
        r['entityScope'] = 'parent-or-component-review' if 'parent-component-review' in flags else 'individual-candidate-scope-unreviewed'
        records.append(r)

# Only exact normalized primary-name matches within a province are merged.
# Similar aliases and parent/component matches are queued for human resolution.
by_key = {}
for r in records:
    key = (r['governorate'], norm(r['name']))
    if key in by_key:
        prior = by_key[key]
        merges.append({'keptId': prior['id'], 'mergedId': r['id'], 'reason': 'same normalized primary name and governorate', 'originFile': r['originFile']})
        prior['alternativeNames'] = sorted(set(prior['alternativeNames'] + r['alternativeNames']))
        prior['sources'] += [s for s in r['sources'] if s not in prior['sources']]
        prior['notes'] += ' | ' + r.get('notes', '')
        prior['reviewFlags'] = sorted(set(prior['reviewFlags'] + r['reviewFlags']))
    else:
        by_key[key] = r
records = sorted(by_key.values(), key=lambda x: (GOVERNORATES.index(x['governorate']), x['name'].casefold()))

source_index = {}
for r in records + quarantine:
    for s in r['sources']:
        s['sourceId'] = uid('src-', s['url'])
        item = source_index.setdefault(s['url'], {'id': s['sourceId'], 'url': s['url'], 'titles': [], 'institutions': [], 'accessLevels': [], 'candidateIds': []})
        for field, value in [('titles', s['title']), ('institutions', s['institution']), ('accessLevels', s['accessLevel']), ('candidateIds', r['id'])]:
            if value not in item[field]:
                item[field].append(value)

pairs = []
for i, a in enumerate(records):
    an = {norm(x) for x in [a['name']] + a['alternativeNames'] if x}
    for b in records[i + 1:]:
        if a['governorate'] != b['governorate']:
            continue
        bn = {norm(x) for x in [b['name']] + b['alternativeNames'] if x}
        overlap = an & bn
        similarity = SequenceMatcher(None, norm(a['name']), norm(b['name'])).ratio()
        if overlap or similarity >= .88:
            pairs.append({'candidateIds': [a['id'], b['id']], 'names': [a['name'], b['name']], 'governorate': a['governorate'], 'reason': 'exact name/alias overlap' if overlap else 'similar primary names', 'similarity': round(similarity, 3), 'resolution': 'needs-human-review; not merged'})

for left, right, reason in [
    ('Khibet al-Qasim', 'Tell Abu Qasim', 'Possible transcription/identity conflict flagged in regional research.'),
    ('Kumeideh', 'ar-Rubeideh', 'Map number 44/prose Rubeidheh versus map number 69: inspect original map; do not merge by spelling.'),
    ('Quchika Tepe', 'Tell Haji', 'Compare survey identifiers across inventories; equivalence not established.'),
]:
    matches = [next(r for r in records if r['name'] == n) for n in (left, right)]
    pairs.append({'candidateIds': [r['id'] for r in matches], 'names': [left, right], 'governorate': matches[0]['governorate'], 'reason': reason, 'resolution': 'needs-human-review; not merged'})

errors = []
for r in records:
    for key in ['name', 'governorate', 'approximateLocation', 'category', 'verificationStatus', 'sources']:
        if not r.get(key):
            errors.append(f"{r['id']}: missing {key}")
    if r['governorate'] not in GOVERNORATES or r['category'] not in CATEGORIES:
        errors.append(f"{r['id']}: invalid province/category")
    if r['verificationStatus'] != 'candidate-needs-review':
        errors.append(f"{r['id']}: inappropriate approval status")
    for s in r['sources']:
        if urlparse(s['url']).scheme not in ('http', 'https') or not urlparse(s['url']).netloc:
            errors.append(f"{r['id']}: invalid source URL")
        if not all(s.get(k) for k in ['title', 'institution', 'locator', 'accessLevel']):
            errors.append(f"{r['id']}: incomplete source metadata")
if len(set(r['id'] for r in records)) != len(records):
    errors.append('duplicate candidate IDs')
coverage = {g: sum(r['governorate'] == g for r in records) for g in GOVERNORATES}
if not all(coverage.values()):
    errors.append('one or more target governorates missing')
report = {'researchDate': DATE, 'candidateCount': len(records), 'byGovernorate': coverage, 'byCategory': dict(sorted(Counter(r['category'] for r in records).items())), 'uniqueSourceUrls': len(source_index), 'quarantinedCount': len(quarantine), 'exactMerges': len(merges), 'identityReviewPairs': len(pairs), 'provisionalGovernorateCount': sum('current-governorate-review' in r['reviewFlags'] for r in records), 'limitedAccessCandidateCount': sum('limited-source-access' in r['reviewFlags'] for r in records), 'validationErrors': errors, 'validationScope': 'Structural validation only. No independent verification of every historical fact, present condition, source availability or modern boundary.'}
report['unresolvedLocalityCount'] = sum('locality-unresolved' in r['reviewFlags'] for r in records)
write('master-candidates.json', {'schemaVersion': 1, 'task': 'C1-01', 'researchDate': DATE, 'scope': 'Discovery candidates for nine target governorates; no publication approval or completeness claim.', 'candidates': records})
write('sources.json', list(source_index.values()))
write('boundary-holds-and-exclusions.json', quarantine)
write('identity-review.json', {'exactMerges': merges, 'possibleIdentityPairs': pairs})
write('validation-report.json', report)

with (ROOT / 'master-candidates.csv').open('w', encoding='utf-8-sig', newline='') as f:
    fields = ['id', 'name', 'alternativeNames', 'governorate', 'governorateStatus', 'approximateLocation', 'category', 'verificationStatus', 'sourceUrls', 'sourceLocators', 'sourceAccess', 'reviewFlags', 'entityScope', 'notes']
    writer = csv.DictWriter(f, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    for r in records:
        row = {k: r.get(k, '') for k in fields}
        row.update(alternativeNames=' | '.join(r['alternativeNames']), sourceUrls=' | '.join(s['url'] for s in r['sources']), sourceLocators=' | '.join(s['sourceId'] + ': ' + s['locator'] for s in r['sources']), sourceAccess=' | '.join(r['sourceAccessSummary']), reviewFlags=' | '.join(r['reviewFlags']))
        # Preserve literal text when opened in spreadsheet applications.
        row = {k: "'" + v if isinstance(v, str) and v.startswith(('=', '+', '-', '@')) else v for k, v in row.items()}
        writer.writerow(row)

print(json.dumps(report, ensure_ascii=True, indent=2))
if errors:
    raise SystemExit(1)
