"""Check every recorded map position in src/data/sites.json before it is shown as a pin.

For each record with latitude/longitude:
  - a source and a precision are recorded (`coordinates_source`, `coordinates_precision`),
  - the point lies in Iraq,
  - for a Wikidata source: the item still gives the same point (within 0.2 km), the item is the site
    itself (its labels share a distinctive word with the card's names) unless the precision says it is
    a settlement or area, and the item's administrative chain (P131) reaches the card's governorate,
  - no other record shares the point unless it is the same complex (parent or component),
  - a component card lies within 5 km of its parent site,
  - a point given as a site is not rounded to one decimal (an error of up to ~5 km).

Writes data/coordinates/coordinate-review.json: one entry per record with the checks that failed.
Manual decisions (data/coordinates/coordinate-decisions.json) settle a flag after a person has looked
at the point: `keep` (the flag is explained) or `remove` (the position is wrong; it is taken off the map).

Usage (from this directory):
    python3 verify_coordinates.py          # check and write the review; exit 1 if an undecided flag remains
"""
import datetime
import json
import sys
from pathlib import Path

import gallery_candidates as gc
import image_queue as iq

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SITES = ROOT / 'src' / 'data' / 'sites.json'
OUT = BASE / 'data' / 'coordinates' / 'coordinate-review.json'
DECISIONS = BASE / 'data' / 'coordinates' / 'coordinate-decisions.json'
SAME_POINT_KM = 0.05
PARENT_KM = 5.0
ITEM_KM = 0.2

# Governorate names as they appear in Wikidata labels of the P131 chain.
GOVERNORATE_LABELS = {
    'Nineveh': {'nineveh', 'ninawa', 'ninewa'}, 'Duhok': {'duhok', 'dohuk', 'dahuk'}, 'Erbil': {'erbil', 'arbil'},
    'Sulaymaniyah': {'sulaymaniyah', 'sulaimaniyah', 'sulaymaniya', 'halabja'},  # Halabja was part of it until 2014
    'Kirkuk': {'kirkuk'}, 'Salah al-Din': {'salah al din', 'saladin', 'salahuddin'}, 'Diyala': {'diyala'},
    'Baghdad': {'baghdad'}, 'Anbar': {'anbar', 'al anbar'},
}


def decimals(value):
    text = repr(float(value))
    return len(text.split('.')[1].rstrip('0')) if '.' in text else 0


def qid_of(record):
    source = record.get('coordinates_source') or ''
    return source.split(':', 1)[1] if source.startswith('wikidata:') else None


def chain_labels(qids, entities, depth=6):
    """English labels of every administrative unit above the given items (P131), fetched level by level."""
    labels = {qid: set() for qid in qids}
    frontier = {qid: set(iq.claim_values(entities[qid], 'P131')) for qid in qids if qid in entities}
    for _ in range(depth):
        wanted = sorted({parent for parents in frontier.values() for parent in parents} - set(entities))
        if wanted:
            entities.update(iq.entities(wanted))
        next_frontier = {}
        for qid, parents in frontier.items():
            for parent in parents:
                entity = entities.get(parent, {})
                label = entity.get('labels', {}).get('en', {}).get('value', '')
                labels[qid].add(iq.norm(label))
                next_frontier.setdefault(qid, set()).update(iq.claim_values(entity, 'P131'))
        frontier = next_frontier
    return labels


def governorate_matches(governorate, labels):
    wanted = GOVERNORATE_LABELS.get(governorate, {iq.norm(governorate)})
    return any(any(name in label for name in wanted) for label in labels)


def main():
    records = json.loads(SITES.read_text(encoding='utf-8'))
    decisions = json.loads(DECISIONS.read_text(encoding='utf-8'))['decisions'] if DECISIONS.exists() else {}
    placed = [r for r in records if isinstance(r.get('latitude'), (int, float)) and isinstance(r.get('longitude'), (int, float))]
    by_id = {r['id']: r for r in records}
    point = lambda r: (r['latitude'], r['longitude'])  # noqa: E731

    qids = sorted({qid for r in placed if (qid := qid_of(r))})
    entities = iq.entities(qids)
    chains = chain_labels(qids, entities)

    review = {}
    for record in placed:
        flags = []
        precision = record.get('coordinates_precision')
        if not record.get('coordinates_source') or not precision:
            flags.append('no-source-or-precision')
        lat, lon = point(record)
        if precision == 'site' and min(decimals(lat), decimals(lon)) <= 1:
            flags.append('coarse-point')  # one decimal is up to ~5 km: not a site position
        if not (iq.IRAQ[0] <= lat <= iq.IRAQ[1] and iq.IRAQ[2] <= lon <= iq.IRAQ[3]):
            flags.append('outside-iraq')
        qid = qid_of(record)
        if qid:
            entity = entities.get(qid)
            coords = [(c['latitude'], c['longitude']) for c in iq.claim_values(entity or {}, 'P625') if isinstance(c, dict)]
            if not entity:
                flags.append('item-missing')
            elif not coords or min(iq.km(point(record), c) for c in coords) > ITEM_KM:
                flags.append('item-point-differs')
            if entity and precision == 'site' and iq.name_match(iq.card_names(record), entity) == 0:
                flags.append('item-not-the-site')
            if entity and chains.get(qid) and not governorate_matches(record['governorate'], chains[qid]):
                flags.append('item-in-other-governorate')
        elif iq.nearest_governorate(point(record)) != record['governorate']:
            # No administrative chain to check: the nearest governorate capital is only a hint.
            flags.append('nearest-capital-in-other-governorate')

        family = {record['id'], record.get('parentSite')} | {r['id'] for r in records if r.get('parentSite') == record['id']}
        sharing = [o['id'] for o in placed if o['id'] != record['id'] and o['id'] not in family
                   and o.get('parentSite') != record.get('parentSite', '-') and iq.km(point(record), point(o)) <= SAME_POINT_KM]
        if sharing:
            flags.append('shares-point:' + ','.join(sorted(sharing)))
        parent = by_id.get(record.get('parentSite') or '')
        if parent and isinstance(parent.get('latitude'), (int, float)) and iq.km(point(record), point(parent)) > PARENT_KM:
            flags.append(f"far-from-parent:{iq.km(point(record), point(parent)):.1f}km")

        decision = decisions.get(record['id'])
        review[record['id']] = {
            'precision': precision, 'source': record.get('coordinates_source'), 'flags': flags,
            'decision': decision['action'] if decision else None,
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    flagged = {k: v for k, v in review.items() if v['flags']}
    OUT.write_text(json.dumps({'checkedAt': datetime.date.today().isoformat(), 'checked': len(review),
                               'flagged': len(flagged), 'records': review}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    undecided = [k for k, v in flagged.items() if not v['decision']]
    for key in flagged:
        print(f"{'  ' if review[key]['decision'] else '! '}{key}: {', '.join(review[key]['flags'])}"
              + (f" [{review[key]['decision']}]" if review[key]['decision'] else ''))
    print(f'{len(review)} positions checked, {len(flagged)} flagged, {len(undecided)} undecided.')
    return 1 if undecided else 0


if __name__ == '__main__':
    sys.exit(main())
