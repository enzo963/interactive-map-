"""List pending heritage records and record explicit human approval/rejection."""
import argparse
import json
import sys
from pathlib import Path

from hb_pipeline.evidence_repository import EvidenceRepository
from hb_pipeline.errors import PipelineError
from hb_pipeline.review_workflow import ReviewWorkflow, records_from, unique_record
from hb_pipeline.storage import Storage
from hb_pipeline.logging import PipelineLogger, error_details

BASE = Path(__file__).resolve().parent


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    listing = sub.add_parser("list", help="List records still requiring review by default.")
    listing.add_argument("--status", choices=["needs-review", "approved", "rejected", "all"], default="needs-review")
    for command in (listing, sub.add_parser("approve"), sub.add_parser("reject")):
        command.add_argument("--input", type=Path, default=BASE / "data/prepared/heritage-sites.json")
        command.add_argument("--ledger", type=Path, help="Default: data/review/decisions.json.")
        if command is not listing:
            command.add_argument("record_id")
            command.add_argument("--reviewer", required=True)
            command.add_argument("--note", required=True, help="Human review rationale; includes acknowledgement of recorded warnings/findings.")
    args = parser.parse_args(argv)
    storage = Storage(BASE / "data")
    logger = PipelineLogger(storage)
    try:
        workflow = ReviewWorkflow(storage, EvidenceRepository(storage.base_dir), args.ledger)
        records = records_from(args.input)
        if args.command == "list":
            rows = workflow.list_records(records, args.status)
            print(json.dumps(rows, ensure_ascii=False, indent=2))
            workflow.logger.log("review.list", "completed", input_path=str(args.input.resolve()), status=args.status, record_count=len(rows))
        else:
            record = unique_record(records, args.record_id)
            decision = workflow.decide(record, "approved" if args.command == "approve" else "rejected", args.reviewer, args.note, args.input)
            print(f"{decision['record_id']}: {decision['status']}. Decision saved; nothing was published.")
        return 0
    except (ValueError, TypeError, KeyError, OSError, RecursionError, PipelineError) as exc:
        logger.log("review.command", "failed", input_path=str(args.input.resolve()), errors=[error_details(exc)])
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
