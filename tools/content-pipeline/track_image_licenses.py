"""Audit image license states in separate unpublished review records."""
import argparse
import sys
from pathlib import Path

from hb_pipeline.evidence_repository import EvidenceRepository, read_json
from hb_pipeline.image_licenses import track_record_images
from hb_pipeline.storage import Storage
from hb_pipeline.logging import PipelineLogger, error_details
from hb_pipeline.errors import PipelineError

BASE = Path(__file__).resolve().parent


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", type=Path, default=BASE / "data/gallery_reviews/heritage-sites.json")
    parser.add_argument("--output", type=Path, default=BASE / "data/license_reviews/heritage-sites.json")
    args = parser.parse_args(argv)
    logger = PipelineLogger(Storage(BASE / "data"))
    try:
        target = args.output.resolve()
        if target == args.input.resolve() or target.is_relative_to((BASE / "data/raw").resolve()) or target.is_relative_to((BASE.parents[1] / "src").resolve()):
            raise ValueError("License audit output must preserve inputs, raw snapshots and frontend files.")
        record = read_json(args.input)
        repository = EvidenceRepository(BASE / "data")
        result, counts = track_record_images(record, repository)
        report = {"records": result, "license_summary": counts, "repository_issues": repository.issues,
                  "automatically_approved": 0, "manual_review_required": True}
        Storage(BASE / "data").save_json(args.output, report)
        logger.log("licenses.audit", "completed", license_summary=counts, automatically_approved=0)
        print(f"Image occurrence license states: {counts}")
        print(f"Saved: {args.output.resolve()}. No image was automatically approved for publication.")
        return 2 if counts['unknown'] or counts['unverified'] or counts['restricted'] or repository.issues else 0
    except (ValueError, TypeError, KeyError, OSError, RecursionError, PipelineError) as exc:
        logger.log("licenses.audit", "failed", errors=[error_details(exc)])
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
