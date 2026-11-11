"""Export current human-approved heritage records into separate website-ready JSON."""
import argparse
import sys
from pathlib import Path

from hb_pipeline.errors import PipelineError
from hb_pipeline.evidence_repository import EvidenceRepository
from hb_pipeline.exporter import export_records
from hb_pipeline.review_workflow import ReviewWorkflow, records_from, record_context
from hb_pipeline.storage import Storage
from hb_pipeline.logging import PipelineLogger, error_details

BASE = Path(__file__).resolve().parent


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=BASE / "data/prepared/heritage-sites.json")
    parser.add_argument("--ledger", type=Path)
    parser.add_argument("--output", type=Path, default=BASE / "data/exports/heritage-sites.approved.json")
    args = parser.parse_args(argv)
    storage = Storage(BASE / "data")
    logger = PipelineLogger(storage)
    try:
        workflow = ReviewWorkflow(storage, EvidenceRepository(storage.base_dir), args.ledger)
        report_path = args.output.with_name(args.output.stem + ".report.json")
        inputs = {args.input.resolve(), workflow.path.resolve()}
        for path in (args.output, report_path):
            target = path.resolve()
            if target in inputs or target.is_relative_to(storage.raw_dir.resolve()) or target.is_relative_to((BASE.parents[1] / "src").resolve()):
                raise ValueError("Export must preserve review inputs, decisions, raw snapshots and frontend files.")
        records = records_from(args.input)
        exported, report = export_records(records, workflow)
        storage.save_json(args.output, exported)
        storage.save_json(report_path, report)
        for record, item in zip(records, report["items"]):
            logger.log("export.record", "included" if item["included"] else "excluded", **record_context(record, workflow.repository), record_id=item["id"], reason=item["reason"], media_omissions=item["media_omissions"])
        logger.log("export", "completed", exported_records=len(exported), input_records=len(records), output=str(args.output.resolve()), published=False)
        print(f"Exported {len(exported)} approved records: {args.output.resolve()}")
        print(f"Report: {report_path.resolve()}. No frontend files were changed; nothing was published.")
        return 2 if any(item["media_omissions"] or (item["status"] == "approved" and not item["included"]) or "changed after" in item["reason"] for item in report["items"]) else 0
    except (ValueError, TypeError, KeyError, OSError, RecursionError, PipelineError) as exc:
        logger.log("export", "failed", errors=[error_details(exc)])
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
