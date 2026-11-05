"""Apply a visual card review (data/images/card-review-<date>.json) to src/data/sites.json.

Actions:
  focus    — set coverImage.focus, the CSS object-position the card crops around.
  withdraw — remove the cover; the card shows the Heritage Bridge fallback (image_status `none`).
             The withdrawn image's renditions under public/images/sites/<slug>/ are deleted.

Usage (from this directory):
    python3 apply_card_review.py data/images/card-review-2026-11-06.json
"""
import json
import re
import shutil
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SITES = ROOT / 'src' / 'data' / 'sites.json'
FOCUS = re.compile(r'^\d{1,3}% \d{1,3}%$')


def main(path):
    review = json.loads(Path(path).read_text(encoding='utf-8'))
    sites = json.loads(SITES.read_text(encoding='utf-8'))
    by_id = {site['id']: site for site in sites}
    changes = []
    for entry in review['entries']:
        site = by_id.get(entry['id'])
        if site is None:
            sys.exit(f"{entry['id']} is not in sites.json")
        cover = site.get('coverImage')
        if entry['action'] == 'focus':
            if not FOCUS.match(entry['focus']):
                sys.exit(f"{entry['id']}: focus must look like '50% 10%'")
            if cover is None:
                sys.exit(f"{entry['id']} has no cover to focus")
            if cover.get('focus') != entry['focus']:
                cover['focus'] = entry['focus']
                changes.append(f"{entry['id']}: focus {entry['focus']}")
        elif entry['action'] == 'withdraw':
            if cover is not None:
                folder = ROOT / 'public' / 'images' / 'sites' / site['slug']
                if folder.is_dir():
                    shutil.rmtree(folder)
                site['coverImage'] = None
                site['image_status'] = 'none'
                note = f"Cover withdrawn in the card review of {review['reviewedAt']}: {entry['reason']}"
                site['review_notes'] = f"{site['review_notes']} {note}" if site.get('review_notes') else note
                changes.append(f"{entry['id']}: cover withdrawn")
        else:
            sys.exit(f"{entry['id']}: unknown action {entry['action']!r}")
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('\n'.join(changes) or 'nothing to change')


if __name__ == '__main__':
    main(sys.argv[1])
