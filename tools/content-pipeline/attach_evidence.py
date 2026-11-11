"""Attach field assertions from saved trusted evidence to an unpublished review copy."""
import argparse
import sys
from pathlib import Path

from hb_pipeline.evidence_repository import EvidenceRepository, read_json
from hb_pipeline.errors import PipelineError
from hb_pipeline.multi_source import build_evidence_view
from hb_pipeline.storage import Storage
from hb_pipeline.logging import PipelineLogger, error_details
from hb_pipeline.utils import slugify

BASE = Path(__file__).resolve().parent


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path, help="One site, a site array, or {sites:[...]} JSON.")
    parser.add_argument("claims", type=Path, help="JSON with siteId and field assertions.")
    parser.add_argument("--output", type=Path, help="Separate output file; defaults to data/evidence_views/<siteId>.json.")
    args = parser.parse_args(argv)
    logger = PipelineLogger(Storage(BASE / "data"))
    try:
        sites, claims = read_json(args.site), read_json(args.claims)
        if not isinstance(claims, dict) or not isinstance(claims.get("siteId"), str):
            raise ValueError("Claims file must identify a siteId.")
        if isinstance(sites, dict) and isinstance(sites.get("sites"), list):
            sites = sites["sites"]
        records = sites if isinstance(sites, list) else [sites]
        selected = [record for record in records if isinstance(record, dict) and record.get("id") == claims["siteId"]]
        if len(selected) != 1:
            raise ValueError("siteId must resolve to exactly one record; duplicate IDs require manual selection.")
        output = args.output or BASE / "data/evidence_views" / (slugify(claims["siteId"]) + ".json")
        target = output.resolve()
        if target in {args.site.resolve(), args.claims.resolve()} or target.is_relative_to((BASE / "data/raw").resolve()) or target.is_relative_to((BASE.parents[1] / "src").resolve()):
            raise ValueError("Output must preserve input files, raw evidence and frontend files.")
        repository = EvidenceRepository(BASE / "data")
        result = build_evidence_view(selected[0], claims, repository)
        result["reliability_review"]["repository_issues"] = repository.issues
        Storage(BASE / "data").save_json(output, result)
        review = result["reliability_review"]
        logger.log("evidence.attach", "completed", governorate=selected[0].get("governorate"), record_id=claims['siteId'],
            evidence_ids=result.get('source_evidence', []), errors=result['reliability_review']['invalid_assertions'])
        print(f"Saved {len(result['evidence_assertions'])} assertions across {len(result['field_evidence'])} fields.")
        print(f"Conflicting/current-value fields: {len(review['conflict_fields'])}; invalid assertions: {len(review['invalid_assertions'])}.")
        print(f"Output: {output.resolve()}")
        print("Original values and all assertions are retained. Preferred values await manual review; nothing was approved or published.")
        return 2 if review["has_conflicts"] or review["invalid_assertions"] or repository.issues else 0
    except (OSError, ValueError, PipelineError, RecursionError) as exc:
        logger.log("evidence.attach", "failed", errors=[error_details(exc)])
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
