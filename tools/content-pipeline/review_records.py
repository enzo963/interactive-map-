"""Audit standardized site data without altering, deleting, or approving inputs."""
import argparse
import sys
from pathlib import Path

from hb_pipeline.errors import PipelineError
from hb_pipeline.site_review import load_evidence_ids, review_record_files
from hb_pipeline.storage import Storage

BASE = Path(__file__).resolve().parent


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="*", type=Path, help="JSON arrays, single records, or {sites: [...]} files.")
    parser.add_argument("--compare", action="append", default=[], type=Path, help="Read-only comparison file; repeat as needed.")
    parser.add_argument("--output", type=Path, default=BASE / "data/review/heritage-review.json")
    parser.add_argument("--evidence-dir", type=Path, default=BASE / "data/raw")
    args = parser.parse_args(argv)
    paths = args.inputs or [BASE / "data/prepared/heritage-sites.json"]
    # Reading the same file twice does not constitute a duplicate site.
    paths = list(dict.fromkeys(path.resolve() for path in [*paths, *args.compare]))
    if args.output.resolve() in paths:
        parser.error("Output must differ from every input/comparison file; inputs are preserved.")
    evidence_ids, evidence_issues = load_evidence_ids(args.evidence_dir)
    report = review_record_files(paths, evidence_ids)
    report["evidence_index_issues"] = evidence_issues
    try:
        Storage(BASE / "data").save_json(args.output, report)
    except (OSError, PipelineError) as exc:
        print(f"ERROR: Could not save review report: {exc}", file=sys.stderr)
        return 1
    summary = report["summary"]
    print(f"Reviewed {summary['input_items']} items: {summary['invalid_items']} invalid, {summary['incomplete_items']} incomplete, {summary['possible_duplicate_pairs']} possible duplicate pairs.")
    print(f"Report: {args.output.resolve()}")
    print("All records await manual review. No inputs were changed, deleted, merged, or approved.")
    return 2 if evidence_issues or summary["invalid_items"] or summary["incomplete_items"] or summary["possible_duplicate_pairs"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
