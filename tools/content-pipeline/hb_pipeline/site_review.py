"""Non-destructive record-file audit with lossless input retention."""
import base64
import copy
import json
from pathlib import Path

from .duplicates import detect_possible_duplicates
from .site_validation import validate_site_record
from .utils import utc_now_iso


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON object key: {key!r}")
        result[key] = value
    return result


def _reject_constant(value):
    raise ValueError(f"Non-standard JSON number: {value}")


def _check_unicode(value):
    if isinstance(value, str):
        value.encode("utf-8")
    elif isinstance(value, list):
        for item in value:
            _check_unicode(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            _check_unicode(key)
            _check_unicode(item)


def load_record_file(path):
    """Return audit items even for bad JSON, encoding, root types, or missing files."""
    path = Path(path)
    reference = str(path.resolve())
    raw = None
    try:
        raw = path.read_bytes()
        text = raw.decode("utf-8-sig")
        payload = json.loads(text, object_pairs_hook=_unique_object, parse_constant=_reject_constant)
        _check_unicode(payload)
    except (OSError, UnicodeError, ValueError, RecursionError) as exc:
        item = {"record_ref": reference, "input_path": reference, "original_record": None,
                "record": None, "parse_issues": [{"field": "$", "code": "malformed_input", "message": str(exc), "severity": "error"}]}
        if raw is not None:
            item["raw_input_base64"] = base64.b64encode(raw).decode("ascii")
        return [item]
    if isinstance(payload, dict) and "sites" in payload and isinstance(payload["sites"], list):
        payload = payload["sites"]
    values = payload if isinstance(payload, list) else [payload]
    if not values:
        return [{"record_ref": reference, "input_path": reference, "original_record": [], "record": [],
                 "parse_issues": [{"field": "$", "code": "empty_dataset", "message": "No heritage records were supplied.", "severity": "error"}]}]
    return [{"record_ref": f"{reference}#record[{index}]", "input_path": reference,
             "original_record": copy.deepcopy(value), "record": copy.deepcopy(value)} for index, value in enumerate(values)]


def load_evidence_ids(raw_dir):
    ids, issues = set(), []
    for path in sorted(Path(raw_dir).rglob("*.evidence.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8-sig"), object_pairs_hook=_unique_object, parse_constant=_reject_constant)
            if not isinstance(payload, dict) or not isinstance(payload.get("evidence_id"), str) or not payload["evidence_id"].strip():
                raise ValueError("Evidence manifest has no usable evidence_id.")
            ids.add(payload["evidence_id"])
        except (OSError, UnicodeError, ValueError, RecursionError) as exc:
            issues.append({"path": str(path.resolve()), "message": str(exc)})
    return ids, issues


def review_record_files(paths, evidence_ids=None):
    paths = list(dict.fromkeys(Path(path).resolve() for path in paths))
    items = [item for path in paths for item in load_record_file(path)]
    for item in items:
        if "parse_issues" in item:
            validation = {"is_valid": False, "status": "needs-review", "issues": item.pop("parse_issues")}
        else:
            validation = validate_site_record(item["record"], evidence_ids)
        item.update({"status": "needs-review", "review_required": True, "validation": validation, "possible_duplicates": []})
        if isinstance(item["record"], dict):
            item["record"]["status"] = "needs-review"
            verification = item["record"].get("verification")
            verification = copy.deepcopy(verification) if isinstance(verification, dict) else {}
            verification.update({"status": "unverified", "review_required": True})
            item["record"]["verification"] = verification
    pairs = detect_possible_duplicates([item["original_record"] for item in items])
    for pair in pairs:
        left, right = pair["left_index"], pair["right_index"]
        pair["left_ref"], pair["right_ref"] = items[left]["record_ref"], items[right]["record_ref"]
        for own, other in ((left, right), (right, left)):
            items[own]["possible_duplicates"].append({"record_ref": items[other]["record_ref"], "confidence": pair["confidence"], "reasons": pair["reasons"]})
    return {
        "tasks": ["P5-07", "P5-08"], "reviewed_at": utc_now_iso(), "status": "needs-review",
        "automatically_approved": 0, "deleted_records": 0, "merged_records": 0,
        "summary": {"input_items": len(items),
                    "invalid_items": sum(not item["validation"]["is_valid"] for item in items),
                    "incomplete_items": sum(any(issue["severity"] == "warning" for issue in item["validation"]["issues"]) for item in items),
                    "items_flagged_as_possible_duplicates": sum(bool(item["possible_duplicates"]) for item in items),
                    "possible_duplicate_pairs": len(pairs)},
        "items": items, "possible_duplicates": pairs,
        "notes": ["Automated checks never constitute approval. Valid records also await manual approval.",
                  "Original records and malformed bytes are retained; source files are never rewritten.",
                  "Shared-source-only matches are weak: one page may describe several different sites.",
                  "Name similarity is heuristic and does not establish identity."],
    }
