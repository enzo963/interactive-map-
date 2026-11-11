"""Apply a reviewed gallery file (data/images/gallery-review-<date>.json) to src/data/sites.json.

Each entry is a candidate from gallery_candidates.py with the reviewer's decision. An approved entry
names the viewpoint it adds (aerial overview, interior, a carved detail...), which becomes its caption.
It is added to the card's galleryImages with its own attribution: creator, license and license URL,
Commons file page, and the evidence and approval records the Site Details page requires, bound to
this site and this image. Rejected entries stay in the review file with their reason.

Rules enforced here:
  - only free licenses (no NC or ND), as for covers;
  - the image is not the card's cover and not already in its gallery (by Commons file page);
  - at most MAX_GALLERY gallery images per card.

Usage (from this directory):
    python3 apply_gallery_review.py data/images/gallery-review-2026-11-09.json
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parent
SITES = BASE.parents[1] / 'src' / 'data' / 'sites.json'
FREE = re.compile(r'^(CC0( 1\.0)?|CC BY(-SA)? \d\.\d( [a-z]{2}| igo)?|Public domain|Copyrighted free use|Attribution)$', re.I)
MAX_GALLERY = 6


def clean_credit(text):
    """Commons sometimes repeats the creator field ('Unknown authorUnknown author'); keep one copy."""
    # Commons HTML can leave object-replacement and other invisible characters behind.
    text = ''.join(ch for ch in (text or '') if unicodedata.category(ch) not in ('Cc', 'Cf', 'Co', 'Cs') and ch != '\ufffc')
    text = ' '.join(text.split())
    half = len(text) // 2
    if len(text) % 2 == 0 and text[:half] == text[half:]:
        text = text[:half]
    return (text or 'Unknown author')[:160]


def gallery_image(record, entry, review):
    src = entry['url']
    reviewed = review['reviewedAt']
    evidence_id = f"wikimedia-commons-{entry['file']}"
    return {
        'src': src,
        'alt': f"{record['name']}: {entry['viewpoint']}",
        'caption': entry['viewpoint'][:1].upper() + entry['viewpoint'][1:],
        'credit': clean_credit(entry['artist']),
        'license': entry['license'],
        'siteId': record['id'],
        'license_status': 'verified',
        'license_url': entry['licenseUrl'],
        'sourceName': 'Wikimedia Commons',
        'sourceUrl': entry['page'],
        'original_url': entry['url'],
        'width': entry['width'],
        'height': entry['height'],
        'identity': {'method': 'commons-category-of-site-item', 'item': entry['qid'], 'category': entry['category'],
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
    added = kept = 0
    for entry in review['entries']:
        record = by_id.get(entry['id'])
        if record is None:
            sys.exit(f"{entry['id']} is not in sites.json")
        if entry['decision'] != 'approved':
            continue
        if not FREE.match(entry['license']) or re.search(r'\b(NC|ND)\b', entry['license']):
            sys.exit(f"{entry['id']}: license {entry['license']!r} is not an accepted free license")
        if not entry.get('viewpoint'):
            sys.exit(f"{entry['id']}: {entry['file']} needs the viewpoint it adds")
        gallery = record.setdefault('galleryImages', [])
        pages = {image.get('sourceUrl') for image in gallery} | {(record.get('coverImage') or {}).get('sourceUrl')}
        if entry['page'] in pages:
            for image in gallery:
                if image.get('sourceUrl') == entry['page']:
                    image['credit'] = clean_credit(entry['artist'])
            kept += 1
            continue
        if len(gallery) >= MAX_GALLERY:
            sys.exit(f"{entry['id']}: more than {MAX_GALLERY} gallery images")
        gallery.append(gallery_image(record, entry, review))
        added += 1
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    rejected = sum(entry['decision'] != 'approved' for entry in review['entries'])
    print(f'{added} gallery images added, {kept} already present, {rejected} candidates rejected')


if __name__ == '__main__':
    main(sys.argv[1])
