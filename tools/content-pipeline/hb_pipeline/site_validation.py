"""Validate standardized site records without auto-approval or data repair."""
import math
import re
from datetime import date, datetime
from urllib.parse import urlparse

from .site_identity import GOVERNORATES, NAME_FIELDS, governorate_key
from .utils import ensure_http_url

REQUIRED_FIELDS = ("id", "name", "governorate", "category", "period", "description", "unesco", "has3D", "coverImage", "galleryImages", "sources")


def valid_access_date(value):
    if not isinstance(value, str):
        return False
    try:
        if re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
            date.fromisoformat(value)
        elif re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-](?:[01][0-9]|2[0-3]):[0-5][0-9])", value):
            if datetime.fromisoformat(value.replace("Z", "+00:00")).utcoffset() is None:
                return False
        else:
            return False
        return True
    except ValueError:
        return False


def validate_site_record(record, evidence_ids=None):
    """Return field-level errors/warnings for any input; do not mutate it.

    Null UNESCO/3D and empty period are valid unknowns, but need manual review.
    Missing or empty sources are errors. Passing evidence_ids checks references.
    """
    issues = []

    def issue(field, code, message, severity="error"):
        issues.append({"field": field, "code": code, "message": message, "severity": severity})

    def result():
        return {"is_valid": not any(item["severity"] == "error" for item in issues), "status": "needs-review" if issues else "valid", "issues": issues}

    if not isinstance(record, dict):
        issue("$", "record_type", "A heritage record must be a JSON object.")
        return result()
    for field in REQUIRED_FIELDS:
        if field not in record:
            issue(field, "required", "Required field is missing.")
    for field in ("id", "name", "governorate", "category", "period", "description"):
        if field not in record:
            continue
        value = record[field]
        if not isinstance(value, str):
            issue(field, "type", "Expected a string.")
        elif not value.strip():
            issue(field, "incomplete", "Value has not been recorded.", "warning" if field in {"category", "period"} else "error")
        elif field == "id" and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", value):
            issue(field, "invalid_id", "ID must be a stable identifier without whitespace or path separators.")
        elif field == "governorate" and governorate_key(value) not in GOVERNORATES:
            issue(field, "invalid_governorate", "Governorate is not recognized; check spelling or geographic attribution.")
        elif field == "description" and len(value.strip()) < 40:
            issue(field, "incomplete", "Short description needs manual completeness review.", "warning")
    for field in ("unesco", "has3D"):
        if field in record:
            if record[field] is None:
                issue(field, "unknown", "Value is unknown; do not infer false.", "warning")
            elif type(record[field]) is not bool:
                issue(field, "type", "Expected true, false, or null; strings and numbers are invalid.")
    for field in NAME_FIELDS:
        if field in record and (not isinstance(record[field], list) or any(not isinstance(name, str) or not name.strip() for name in record[field])):
            issue(field, "type", "Alternative names must be a list of non-empty strings.")
    for field, minimum, maximum in (("latitude", -90, 90), ("longitude", -180, 180)):
        value = record.get(field)
        if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not minimum <= value <= maximum or not math.isfinite(value)):
            issue(field, "coordinate", f"Expected a finite coordinate from {minimum} to {maximum}, or null.")

    def image(value, field):
        if not isinstance(value, dict):
            issue(field, "type", "Image must be an object with src, alt, caption, credit and license.")
            return
        for key in ("src", "alt", "caption", "credit", "license"):
            if key not in value:
                issue(f"{field}.{key}", "required", "Image field is missing.")
            elif not isinstance(value[key], str):
                issue(f"{field}.{key}", "type", "Image metadata must be a string.")
        src = value.get("src")
        if isinstance(src, str):
            try:
                if not src.strip() or src.startswith("//") or "\\" in src or any(ord(char) < 32 for char in src):
                    raise ValueError("Invalid image address.")
                if urlparse(src).scheme:
                    ensure_http_url(src)
            except ValueError as exc:
                issue(f"{field}.src", "url", str(exc))
        for key in ("alt", "credit", "license"):
            if value.get(key) == "":
                issue(f"{field}.{key}", "incomplete", "Assigned image needs metadata review.", "warning")

    if "coverImage" in record:
        if record["coverImage"] is None:
            issue("coverImage", "unassigned", "No reviewed cover image is assigned.", "warning")
        else:
            image(record["coverImage"], "coverImage")
    if "galleryImages" in record:
        if not isinstance(record["galleryImages"], list):
            issue("galleryImages", "type", "Expected an array of image objects.")
        else:
            for index, value in enumerate(record["galleryImages"]):
                image(value, f"galleryImages[{index}]")
    sources = record.get("sources")
    if "sources" in record:
        if not isinstance(sources, list):
            issue("sources", "type", "Expected a non-empty array of source objects.")
        elif not sources:
            issue("sources", "missing_sources", "At least one real source is required before approval.")
        else:
            for index, source in enumerate(sources):
                prefix = f"sources[{index}]"
                if not isinstance(source, dict):
                    issue(prefix, "type", "Source must be an object.")
                    continue
                for key in ("sourceName", "url", "evidenceId", "accessedAt"):
                    if key not in source:
                        issue(f"{prefix}.{key}", "required", "Source field is missing.")
                if not isinstance(source.get("sourceName"), str) or not source["sourceName"].strip():
                    issue(f"{prefix}.sourceName", "incomplete", "A source name or citation is required.")
                url = source.get("url")
                if not isinstance(url, str):
                    issue(f"{prefix}.url", "type", "Source URL must be a string.")
                elif not url:
                    issue(f"{prefix}.url", "incomplete", "Citation has no online link.", "warning")
                else:
                    try:
                        ensure_http_url(url)
                    except ValueError as exc:
                        issue(f"{prefix}.url", "url", str(exc))
                ref = source.get("evidenceId")
                if ref is None:
                    issue(f"{prefix}.evidenceId", "incomplete", "Evidence reference is not recorded.", "warning")
                elif not isinstance(ref, str) or not ref.strip():
                    issue(f"{prefix}.evidenceId", "type", "Evidence ID must be a non-empty string or null.")
                elif evidence_ids is not None and ref not in evidence_ids:
                    issue(f"{prefix}.evidenceId", "unknown_evidence", "Evidence ID does not resolve to a saved evidence manifest.")
                refs = record.get("source_evidence")
                if isinstance(refs, list) and isinstance(ref, str) and ref not in refs:
                    issue(f"{prefix}.evidenceId", "provenance", "Source reference is not in this draft's source_evidence.")
                accessed = source.get("accessedAt")
                if accessed is None:
                    issue(f"{prefix}.accessedAt", "incomplete", "Access date is unknown; do not invent one.", "warning")
                elif not valid_access_date(accessed):
                    issue(f"{prefix}.accessedAt", "date", "Expected a real ISO date or timezone-qualified timestamp.")
    if "source_evidence" in record:
        refs = record["source_evidence"]
        if not isinstance(refs, list) or not refs or any(not isinstance(ref, str) or not ref.strip() for ref in refs):
            issue("source_evidence", "type", "Expected a non-empty list of evidence IDs.")
        elif evidence_ids is not None and any(ref not in evidence_ids for ref in refs):
            issue("source_evidence", "unknown_evidence", "A draft evidence ID does not resolve.")
    return result()
