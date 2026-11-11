"""Apply a reviewed cover-image file to src/data/sites.json.

Input: data/images/cover-review-<date>.json, one entry per candidate:
  record id, Wikidata item, how the item was matched to the card, the Commons file with its
  creator, license and URLs, and the reviewer's decision (`approved` / `rejected`) with a reason.

Candidates come from the Wikidata image (P18) of the card's own item: the item for the site
itself, never its town or region. Only free licenses are accepted. A card receives a cover only
when the candidate was approved after visual review; every other card keeps the Heritage Bridge
fallback (image_status `none`). Existing approved covers are left as they are.

Usage (from this directory):
    python3 apply_cover_review.py data/images/cover-review-2026-11-03.json
"""
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
SITES = BASE.parents[1] / 'src' / 'data' / 'sites.json'
FREE = re.compile(r'^(CC0|CC BY(-SA)? \d\.\d( igo)?|CC BY(-SA)? \d\.\d [a-z]{2}|Public domain|Copyrighted free use|Attribution)$', re.I)


def cover_for(record, entry, review):
    src = entry['thumb'] or entry['url']
    reviewed = review['reviewedAt']
    credit = entry['artist'] or entry['credit'] or 'Unknown author'
    evidence_id = f"wikimedia-commons-{entry['file']}"
    return {
        'src': src,
        'alt': f"{record['name']}, {record['governorate']}",
        'caption': '',
        'credit': credit[:160],
        'license': entry['license'],
        'siteId': record['id'],
        'license_status': 'verified',
        'license_url': entry['licenseUrl'],
        'sourceName': 'Wikimedia Commons',
        'sourceUrl': entry['page'],
        'original_url': entry['url'],
        'width': entry['width'],
        'height': entry['height'],
        'identity': {'method': 'wikidata-image-of-site-item', 'item': entry['qid'], 'matchedBy': entry['how'],
                     'reviewedBy': review['reviewer'], 'reviewedAt': reviewed, 'note': entry['reason']},
        'license_review': {
            'permission': 'publication-permitted', 'license': entry['license'],
            'reviewedBy': review['reviewer'], 'reviewedAt': reviewed, 'image_url': src,
            'evidence': [{'evidenceId': evidence_id, 'source_url': entry['page'], 'image_url': src}],
        },
        'license_tracking': {
            'evidence_valid': True, 'automatically_approved': False,
            'evidence_checks': [{'valid': True, 'source': {'sourceId': 'wikimedia-commons', 'sourceName': 'Wikimedia Commons',
                                                           'url': entry['page'], 'evidenceId': evidence_id, 'accessedAt': reviewed}}],
        },
        'publication_approval': {
            'status': 'approved', 'siteId': record['id'], 'site_verified': True, 'image_url': src,
            'reviewedBy': review['reviewer'], 'reviewedAt': reviewed, 'method': review['method'],
        },
    }


def main(path):
    review = json.loads(Path(path).read_text(encoding='utf-8'))
    sites = json.loads(SITES.read_text(encoding='utf-8'))
    by_id = {site['id']: site for site in sites}
    applied = kept = 0
    for entry in review['entries']:
        record = by_id.get(entry['id'])
        if record is None:
            sys.exit(f"{entry['id']} is not in sites.json")
        if entry['decision'] != 'approved':
            continue
        if not FREE.match(entry['license']):
            sys.exit(f"{entry['id']}: license {entry['license']!r} is not an accepted free license")
        if record.get('image_status') == 'approved':
            kept += 1
            continue
        record['coverImage'] = cover_for(record, entry, review)
        record['image_status'] = 'approved'
        applied += 1
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    rejected = sum(entry['decision'] != 'approved' for entry in review['entries'])
    print(f'{applied} covers applied, {kept} existing approved covers kept, {rejected} candidates rejected')


if __name__ == '__main__':
    main(sys.argv[1])
