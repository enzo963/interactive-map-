"""Re-extract saved evidence and prepare an unpublished site/image review copy."""
import argparse
import copy
import sys
from pathlib import Path

from bs4 import BeautifulSoup

from hb_pipeline.evidence_repository import EvidenceRepository, read_json
from hb_pipeline.errors import PipelineError
from hb_pipeline.extractor import extract_page
from hb_pipeline.images import select_cover
from hb_pipeline.storage import Storage
from hb_pipeline.utils import slugify

BASE = Path(__file__).resolve().parent


def prepare(site, evidence_ids, repository, known_sites=None):
    if not isinstance(site, dict) or not isinstance(site.get("id"), str) or not site["id"].strip():
        raise ValueError("Image review requires a stable site id.")
    if not isinstance(evidence_ids, list) or not evidence_ids or any(not isinstance(ref, str) or not ref for ref in evidence_ids):
        raise ValueError("Supply at least one saved evidence ID.")
    result = copy.deepcopy(site)
    images, extractions, errors = [], [], []
    citations = []
    for ref in dict.fromkeys(evidence_ids):
        try:
            matches = repository.index.get(ref, [])
            if len(matches) != 1:
                raise ValueError("Evidence ID is missing or ambiguous.")
            manifest = matches[0][1]
            path = repository._path(manifest.get("html_path"))
            raw = path.read_bytes()
            soup = BeautifulSoup(raw, "html.parser")
            phrase = next((value.strip() for value in soup.stripped_strings if value.strip()), "")
            citation, source = repository.resolve(ref, {"artifact": str(path), "selector": "*", "text_match": phrase})
            extraction = extract_page(raw, citation["url"], target_site=site, source=source, known_sites=known_sites)
            for image in extraction.image_candidates:
                image["evidenceId"] = ref
                image["accessedAt"] = citation["accessedAt"]
                images.append(image)
            extractions.append({"evidenceId": ref, "source": citation, "extraction": extraction.to_dict()})
            citations.append(citation)
        except (ValueError, TypeError, KeyError, OSError, PipelineError) as exc:
            errors.append({"evidenceId": ref, "message": str(exc)})
    # One URL can have several independent source observations. Preserve each,
    # but rank an image only once. Conflicting identity observations exclude it.
    groups = {}
    for image in images:
        groups.setdefault(image["url"], []).append(image)
    ranked = []
    for observations in groups.values():
        conflict = any(item["association_status"] == "ambiguous" or (item["association_status"] == "unmatched" and any("other catalog sites" in note for note in item["review_notes"])) for item in observations)
        if conflict and any(item["siteId"] == site["id"] for item in observations):
            for item in observations:
                item["original_association"] = {"siteId": item["siteId"], "association_status": item["association_status"]}
                item.update(siteId=None, association_status="ambiguous")
                item["review_notes"].append("Other observations of this same image URL have conflicting site identity; no association was retained.")
        matched = [item for item in observations if item["siteId"] == site["id"]]
        if not matched:
            ranked.append(observations[0])
            continue
        chosen = min(matched, key=lambda item: (item["trust_tier"] or 999, -(item.get("width") or 0) * (item.get("height") or 0)))
        chosen = copy.deepcopy(chosen)
        chosen["observations"] = copy.deepcopy(observations)
        ranked.append(chosen)
    cover = select_cover(ranked, site["id"], repository.registry)
    original_cover = copy.deepcopy(site.get("coverImage"))
    if original_cover is None:
        result["coverImage"] = copy.deepcopy(cover["proposed_coverImage"])
    else:
        cover["notes"].append("Existing cover was preserved; the proposal is a review alternative.")
    result.update(image_candidates=images, image_extractions=extractions, cover_selection=cover,
                  status="needs-review", image_review={"errors": errors, "repository_issues": repository.issues,
                      "original_coverImage": original_cover, "original_image_candidates": copy.deepcopy(site.get("image_candidates", [])), "manual_review_required": True, "automatically_approved": False})
    verification = copy.deepcopy(site.get("verification")) if isinstance(site.get("verification"), dict) else {}
    verification.update(status="unverified", review_required=True)
    result["verification"] = verification
    result["sources"] = copy.deepcopy(site.get("sources")) if isinstance(site.get("sources"), list) else []
    result["source_evidence"] = list(site.get("source_evidence")) if isinstance(site.get("source_evidence"), list) else []
    for citation in citations:
        if not any(isinstance(item, dict) and item.get("evidenceId") == citation["evidenceId"] for item in result["sources"]):
            result["sources"].append(citation)
        if citation["evidenceId"] not in result["source_evidence"]:
            result["source_evidence"].append(citation["evidenceId"])
    provenance = copy.deepcopy(site.get("provenance")) if isinstance(site.get("provenance"), dict) else {}
    for field, refs in (("image_candidates", list(dict.fromkeys(item["evidenceId"] for item in images))),
                        ("coverImage", [cover["proposed_coverImage"]["evidenceId"]] if cover["proposed_coverImage"] and original_cover is None else [])):
        old = provenance.get(field, [])
        provenance[field] = list(dict.fromkeys((old if isinstance(old, list) else []) + refs))
    result["provenance"] = provenance
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path, help="Site record, array or {sites:[...]} catalog.")
    parser.add_argument("--site-id", required=True)
    parser.add_argument("--evidence", action="append", help="Saved evidence ID; repeat for multiple sources. Defaults to the site's source_evidence.")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        records = read_json(args.site)
        if isinstance(records, dict) and isinstance(records.get("sites"), list):
            records = records["sites"]
        records = records if isinstance(records, list) else [records]
        selected = [item for item in records if isinstance(item, dict) and item.get("id") == args.site_id]
        if len(selected) != 1:
            raise ValueError("site-id must select exactly one record.")
        output = args.output or BASE / "data/image_reviews" / (slugify(args.site_id) + ".json")
        target = output.resolve()
        if target == args.site.resolve() or target.is_relative_to((BASE / "data/raw").resolve()) or target.is_relative_to((BASE.parents[1] / "src").resolve()):
            raise ValueError("Output must preserve input records, raw artifacts and frontend files.")
        repository = EvidenceRepository(BASE / "data")
        result = prepare(selected[0], args.evidence or selected[0].get("source_evidence"), repository, records)
        Storage(BASE / "data").save_json(output, result)
        print(f"Saved {len(result['image_candidates'])} image observations: {output.resolve()}")
        print(f"Cover: {result['cover_selection']['status']}. All associations, licenses and cover proposals require manual review.")
        uncertain = any(image["siteId"] is None for image in result["image_candidates"])
        return 2 if result["image_review"]["errors"] or repository.issues or uncertain or result["cover_selection"]["status"] != "proposed-unverified" else 0
    except (ValueError, TypeError, OSError, PipelineError, RecursionError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
