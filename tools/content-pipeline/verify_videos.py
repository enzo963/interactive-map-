"""Check src/data/site-videos.json against YouTube and sites.json.

For every video:
  - YouTube's oEmbed endpoint still returns it (not removed or made private),
  - its title matches the recorded title,
  - its channel is the publisher's channel (`publishers[<key>].channelUrl`), so a video can only be
    attributed to the institution that published it,
  - every card it is linked to exists in sites.json, with a known relation.

Usage (from this directory):
    python3 verify_videos.py            # report problems; exit 1 if any
    python3 verify_videos.py --stamp    # also record today's date as verification.checkedAt
"""
import datetime
import json
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VIDEOS = ROOT / 'src' / 'data' / 'site-videos.json'
SITES = ROOT / 'src' / 'data' / 'sites.json'
UA = 'HistoryInCards-research/1.0'
RELATIONS = {'site', 'part', 'context'}
KINDS = {'overview', 'restoration', 'excavation', 'documentation-3d', 'lecture', 'historic-district'}


def oembed(url):
    endpoint = 'https://www.youtube.com/oembed?' + urllib.parse.urlencode({'url': url, 'format': 'json'})
    for attempt in range(3):
        result = subprocess.run(['curl', '-s', '-f', '-A', UA, '--max-time', '30', endpoint], capture_output=True, check=False)
        if result.returncode == 0:
            return json.loads(result.stdout)
        if result.returncode == 22:  # HTTP error: 401/404 mean private or removed
            return None
        time.sleep(3 * (attempt + 1))
    return None


def main():
    stamp = '--stamp' in sys.argv
    data = json.loads(VIDEOS.read_text(encoding='utf-8'))
    site_ids = {site['id'] for site in json.loads(SITES.read_text(encoding='utf-8'))}
    problems = []
    for video in data['videos']:
        label = f"{video['videoId']} ({video['title'][:50]})"
        publisher = data['publishers'].get(video['publisher'])
        if publisher is None or publisher['type'] not in data['publisherTypes']:
            problems.append(f'{label}: unknown publisher or publisher type')
            continue
        if video['kind'] not in KINDS:
            problems.append(f"{label}: unknown kind {video['kind']}")
        for link in video['sites']:
            if link['siteId'] not in site_ids:
                problems.append(f"{label}: no card {link['siteId']}")
            if link['relation'] not in RELATIONS or (link['relation'] != 'site' and not link.get('note')):
                problems.append(f"{label}: relation {link['relation']} needs a note")
        found = oembed(video['url'])
        if found is None:
            problems.append(f'{label}: not available on YouTube')
            continue
        if ' '.join(found['title'].split()) != ' '.join(video['title'].split()):
            problems.append(f"{label}: title is now {found['title']!r}")
        if found['author_url'].rstrip('/') != publisher['channelUrl'].rstrip('/'):
            problems.append(f"{label}: published by {found['author_name']} ({found['author_url']}), not {publisher['name']}")
        elif stamp:
            video['verification']['checkedAt'] = datetime.date.today().isoformat()
        time.sleep(0.5)
    if stamp and not problems:
        VIDEOS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('\n'.join(problems) or f"{len(data['videos'])} videos verified")
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
