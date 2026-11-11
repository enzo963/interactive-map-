"""Validate image URLs and prepare separate unpublished heritage galleries."""
import argparse
import copy
import sys
from pathlib import Path

from hb_pipeline.evidence_repository import read_json
from hb_pipeline.galleries import prepare_gallery, flag_shared_site_images
from hb_pipeline.images import ImageIdentityIndex
from hb_pipeline.image_validation import ImageURLValidator
from hb_pipeline.errors import PipelineError
from hb_pipeline.storage import Storage
from hb_pipeline.logging import PipelineLogger, error_details

BASE = Path(__file__).resolve().parent


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="*", type=Path, help="Site/image review JSON files; defaults to data/image_reviews/*.json.")
    parser.add_argument("--site-id", help="Optionally select one unique site from the input records.")
    parser.add_argument("--output", type=Path, default=BASE / "data/gallery_reviews/heritage-sites.json")
    args = parser.parse_args(argv)
    logger = PipelineLogger(Storage(BASE / "data"))
    validator = None
    try:
        inputs = args.inputs or sorted((BASE / "data/image_reviews").glob("*.json"))
        if not inputs:
            raise ValueError("No image review inputs found; run prepare_images.py first.")
        target = args.output.resolve()
        if target in {path.resolve() for path in inputs} or target.is_relative_to((BASE / "data/raw").resolve()) or target.is_relative_to((BASE.parents[1] / "src").resolve()):
            raise ValueError("Output must preserve input records, raw evidence and frontend files.")
        records, input_errors = [], []
        for path in inputs:
            try:
                payload = read_json(path)
                if isinstance(payload, dict) and isinstance(payload.get("sites"), list):
                    payload = payload["sites"]
                records.extend(payload if isinstance(payload, list) else [payload])
            except (OSError, ValueError, RecursionError) as exc:
                input_errors.append({"path": str(path), "reason": str(exc)})
        selected = records
        if args.site_id:
            selected = [record for record in records if isinstance(record, dict) and record.get("id") == args.site_id]
            if len(selected) != 1:
                raise ValueError("site-id must select exactly one input record.")
        if not records and not input_errors:
            raise ValueError("Input catalog contains no records.")
        validator = ImageURLValidator(logger=logger)
        prepared = []
        identities = ImageIdentityIndex(records)
        for record in selected:
            try:
                prepared.append(prepare_gallery(record, validator, identities))
            except (ValueError, TypeError, KeyError, PipelineError) as exc:
                prepared.append({"original_record": copy.deepcopy(record), "status": "needs-review", "galleryImages": [],
                                 "gallery_review": {"error": str(exc), "manual_review_required": True, "automatically_approved": False}})
        shared_conflicts = flag_shared_site_images(prepared)
        summary = {"shared_image_identity_conflicts": shared_conflicts, "sites": len(prepared), "gallery_images": sum(len(site["galleryImages"]) for site in prepared),
                   "skipped_image_groups": sum(len(site["gallery_review"].get("skipped_images", [])) for site in prepared),
                   "input_errors": input_errors, "record_errors": sum("error" in site["gallery_review"] for site in prepared),
                   "automatically_approved": 0, "manual_review_required": True}
        Storage(BASE / "data").save_json(args.output, {"sites": prepared, "summary": summary, "url_checks": list(validator.cache.values())})
        logger.log("gallery.prepare", "completed", summary=summary, errors=input_errors)
        print(f"Prepared {summary['gallery_images']} gallery images across {summary['sites']} site review records.")
        print(f"Skipped {summary['skipped_image_groups']} image groups; input/record errors: {len(input_errors) + summary['record_errors']}.")
        print(f"Saved: {args.output.resolve()}. Identity and license review remain required; nothing was published.")
        return 2 if input_errors or summary['record_errors'] or summary['skipped_image_groups'] or any(not site['galleryImages'] for site in prepared) else 0
    except (ValueError, TypeError, OSError, PipelineError, RecursionError) as exc:
        logger.log("gallery.prepare", "failed", errors=[error_details(exc)])
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    finally:
        if validator:
            validator.close()


if __name__ == "__main__":
    raise SystemExit(main())
