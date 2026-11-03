"""Find the same heritage site recorded twice, and apply reviewed identity decisions.

  python3 dedupe_sites.py report   # candidate pairs not yet settled by a decision
  python3 dedupe_sites.py apply    # apply data/site-identity-decisions.json to sites.json

Run `report` after adding a discovery batch and before publishing its cards. Settle every
pair it lists with a merge, component or distinct decision, then run `apply`. Run `apply`
again after rebuilding any batch, so merged records do not come back.
"""
import argparse
import json
import sys
from pathlib import Path

from hb_pipeline.duplicates import detect_possible_duplicates
from hb_pipeline.site_merge import DecisionError, apply_decisions, decision_pairs

BASE = Path(__file__).resolve().parent
SITES = BASE.parents[1] / "src" / "data" / "sites.json"
DECISIONS = BASE / "data" / "site-identity-decisions.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def unresolved_pairs(records, decisions, include_low=False):
    settled = decision_pairs(decisions)
    for pair in detect_possible_duplicates(records):
        left, right = records[pair["left_index"]], records[pair["right_index"]]
        if frozenset((left["id"], right["id"])) in settled:
            continue
        if pair["confidence"] == "low" and not include_low:
            continue
        yield left, right, pair


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=("report", "apply"))
    parser.add_argument("--sites", type=Path, default=SITES)
    parser.add_argument("--decisions", type=Path, default=DECISIONS)
    parser.add_argument("--all", action="store_true", help="Also list low-confidence pairs (shared source only).")
    args = parser.parse_args(argv)
    records = load(args.sites)
    decisions = load(args.decisions)["decisions"]

    if args.command == "report":
        count = 0
        for left, right, pair in unresolved_pairs(records, decisions, args.all):
            count += 1
            names = pair["matched_names"] or pair["similar_name"] or ""
            relation = f" [{pair['relation']}]" if pair["relation"] else ""
            print(f"{pair['confidence']:6} {left['id']} ~ {right['id']}{relation}: {', '.join(pair['reasons'])} {names}")
        print(f"{count} unsettled pair(s).")
        return 2 if count else 0

    try:
        updated, log = apply_decisions(records, decisions)
    except DecisionError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    for line in log:
        print(line)
    if log:
        args.sites.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(log)} change(s); {len(updated)} records.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
