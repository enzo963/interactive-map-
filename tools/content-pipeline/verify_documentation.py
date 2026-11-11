"""Check src/data/digital-documentation.json against Sketchfab and sites.json.

For every resource:
  - the model is still public on Sketchfab (API v3), under the same title and the same creator account,
  - its license still matches the recorded one (no license is recorded as "All rights reserved"),
  - it is classified: documentation `measured` or `modeled`, a known method, methodEvidence `stated`
    or `inferred` with a methodNote, and what state it shows (`depicts`),
  - a `manual-modeling` method is never classed as measured, and a measured record never uses it,
  - every linked card exists, with a known relation (`part` and `context` links need a note).

Usage (from this directory):
    python3 verify_documentation.py            # report problems; exit 1 if any
    python3 verify_documentation.py --stamp    # also record today's date as verification.checkedAt
"""
import datetime
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'src' / 'data' / 'digital-documentation.json'
SITES = ROOT / 'src' / 'data' / 'sites.json'
UA = 'HistoryInCards-research/1.0'
RELATIONS = {'site', 'part', 'context'}


def model(uid):
    for attempt in range(3):
        result = subprocess.run(['curl', '-s', '-f', '-A', UA, '--max-time', '30', f'https://api.sketchfab.com/v3/models/{uid}'],
                                capture_output=True, check=False)
        if result.returncode == 0:
            return json.loads(result.stdout)
        if result.returncode == 22:  # 404: removed or made private
            return None
        time.sleep(3 * (attempt + 1))
    return None


def main():
    stamp = '--stamp' in sys.argv
    data = json.loads(DATA.read_text(encoding='utf-8'))
    site_ids = {site['id'] for site in json.loads(SITES.read_text(encoding='utf-8'))}
    problems = []
    for resource in data['resources']:
        label = f"{resource['modelId'][:8]} ({resource['title'][:40]})"
        creator = data['creators'].get(resource['creator'])
        if creator is None or creator['type'] not in data['creatorTypes']:
            problems.append(f'{label}: unknown creator or creator type')
        if resource['documentation'] not in data['documentationTypes'] or resource['method'] not in data['methods']:
            problems.append(f'{label}: unknown documentation class or method')
        if (resource['method'] == 'manual-modeling') != (resource['documentation'] == 'modeled'):
            problems.append(f'{label}: manual modelling must be classed modeled, and modeled records must say so')
        if resource['methodEvidence'] not in {'stated', 'inferred'} or not resource.get('methodNote', '').strip():
            problems.append(f'{label}: method evidence and its note are required')
        if not resource.get('depicts', '').strip():
            problems.append(f'{label}: say what state the model shows')
        for link in resource['sites']:
            if link['siteId'] not in site_ids:
                problems.append(f"{label}: no card {link['siteId']}")
            if link['relation'] not in RELATIONS or (link['relation'] != 'site' and not link.get('note')):
                problems.append(f"{label}: relation {link['relation']} needs a note")
        found = model(resource['modelId'])
        if found is None:
            problems.append(f'{label}: no longer public on Sketchfab')
            continue
        if found['name'].strip() != resource['title'].strip():
            problems.append(f"{label}: title is now {found['name']!r}")
        if found['user']['username'] != resource['creator']:
            problems.append(f"{label}: now published by {found['user']['username']}")
        license_label = (found.get('license') or {}).get('label') or 'All rights reserved'
        if license_label != resource['license']:
            problems.append(f"{label}: license is now {license_label}")
        if not problems and stamp:
            resource['verification']['checkedAt'] = datetime.date.today().isoformat()
        time.sleep(0.4)
    if stamp and not problems:
        DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('\n'.join(problems) or f"{len(data['resources'])} resources verified")
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
