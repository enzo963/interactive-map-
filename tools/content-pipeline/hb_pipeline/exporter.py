"""Website-facing JSON from current explicit human decisions; no publication step."""
import copy
import re
from collections import Counter

from .errors import PipelineError
from .image_licenses import track_license, license_state
from .review_workflow import record_id
from .site_validation import REQUIRED_FIELDS, validate_site_record, valid_access_date
from .utils import normalize_url, utc_now_iso


def _url_key(image):
    try:
        return normalize_url(image.get("src")) if isinstance(image, dict) else None
    except (ValueError, TypeError):
        return None


def _known_failure(image):
    checks = image.get("url_validation", [])
    checks = checks if isinstance(checks, list) else [checks]
    return any(isinstance(check, dict) and check.get("valid") is False for check in checks)


def _image(image, site_id, repository):
    if not isinstance(image, dict):
        return None, "Image is not an object."
    try:
        if _known_failure(image):
            return None, "Known image URL/content validation failure requires review."
        observations = image.get("source_observations", [])
        if isinstance(observations, list) and any(isinstance(item, dict) and (license_state(item) == "restricted" or item.get("licenseStatus") == "restricted") for item in observations):
            return None, "A source observation restricts this image."
        audited = track_license(image, repository)
        if license_state(audited) != "verified" or image.get("licenseStatus", "verified") != "verified":
            return None, "Image license has no current verified evidence or carries a conflicting state."
        approval = image.get("publication_approval")
        url = normalize_url(image.get("src"))
        if (not isinstance(approval, dict) or approval.get("status") != "approved" or approval.get("siteId") != site_id
            or image.get("siteId") != site_id or approval.get("site_verified") is not True
            or normalize_url(approval.get("image_url")) != url or not isinstance(approval.get("reviewedBy"), str)
            or not approval["reviewedBy"].strip() or not valid_access_date(approval.get("reviewedAt"))):
            return None, "Image lacks explicit publication approval bound to this site and image URL."
        if any(not isinstance(image.get(key, ""), str) for key in ("alt", "caption", "credit", "license")):
            return None, "Image text/credit metadata is malformed."
        review = audited["license_review"]
        tracking = audited["license_tracking"]
        clean = {"src": url, "alt": image.get("alt", ""), "caption": image.get("caption", ""),
            "credit": image.get("credit", ""), "license": review["license"], "siteId": site_id, "license_status": "verified",
            "license_review": {key: copy.deepcopy(review[key]) for key in ("permission", "reviewedBy", "reviewedAt", "license", "image_url")},
            "license_tracking": {"evidence_valid": True, "automatically_approved": False,
                "evidence_checks": [{"valid": True, "source": check["source"]} for check in tracking["evidence_checks"]]},
            "publication_approval": {key: copy.deepcopy(approval[key]) for key in ("status", "siteId", "site_verified", "image_url", "reviewedBy", "reviewedAt")}}
        clean["license_review"]["evidence"] = [{key: item[key] for key in ("evidenceId", "source_url", "image_url")} for item in review["evidence"]]
        for key in ("sourceName", "sourceUrl", "license_url"):
            if isinstance(image.get(key), str) and image[key]:
                if key != "sourceName":
                    normalize_url(image[key])
                clean[key] = image[key]
        if isinstance(observations, list):
            clean["source_observations"] = []
            for item in observations:
                if not isinstance(item, dict):
                    continue
                name = item.get("sourceName", item.get("source_name", ""))
                source_url = item.get("sourceUrl", item.get("source_url", ""))
                try:
                    source_url = normalize_url(source_url)
                except (ValueError, TypeError):
                    source_url = ""
                credit = item.get("credit", "")
                clean["source_observations"].append({"sourceName": name if isinstance(name, str) else "",
                    "sourceUrl": source_url, "credit": credit if isinstance(credit, str) else "", "license_status": license_state(item)})
        return clean, None
    except (ValueError, TypeError, KeyError, IndexError, OSError, PipelineError) as exc:
        return None, f"Image evidence requires review: {exc}"


def export_records(records, workflow):
    ledger = workflow.load()
    ids = Counter(record_id(record) for record in records if record_id(record))
    exported, items = [], []
    for record in records:
        rid = record_id(record)
        status, reason = workflow.effective_status(record, ledger)
        item = {"id": rid, "status": status, "included": False, "reason": reason, "media_omissions": []}
        if rid and ids[rid] > 1:
            item["reason"] = "Duplicate record ID in input; no ambiguous approval can be exported."
        elif status == "approved":
            try:
                clean = {key: copy.deepcopy(record[key]) for key in REQUIRED_FIELDS}
                blocked = {}
                for image in [record.get("coverImage"), *record.get("galleryImages", [])]:
                    if isinstance(image, dict) and (license_state(image) == "restricted" or image.get("licenseStatus") == "restricted" or _known_failure(image)):
                        try:
                            blocked[normalize_url(image.get("src"))] = "Known image validation failure." if _known_failure(image) else "A record observation restricts this image URL."
                        except (ValueError, TypeError):
                            pass
                clean["coverImage"] = None
                clean["galleryImages"] = []
                if record.get("coverImage") is not None:
                    if _url_key(record["coverImage"]) in blocked:
                        error = blocked[_url_key(record["coverImage"])]
                    else:
                        clean["coverImage"], error = _image(record["coverImage"], rid, workflow.repository)
                    if error:
                        item["media_omissions"].append({"field": "coverImage", "reason": error})
                seen = set()
                for index, image in enumerate(record.get("galleryImages", [])):
                    if _url_key(image) in blocked:
                        prepared, error = None, blocked[_url_key(image)]
                    else:
                        prepared, error = _image(image, rid, workflow.repository)
                    if error:
                        item["media_omissions"].append({"field": f"galleryImages[{index}]", "reason": error})
                    elif prepared["src"] not in seen:
                        seen.add(prepared["src"])
                        clean["galleryImages"].append(prepared)
                clean["sources"] = [{key: source[key] for key in ("sourceName", "url", "evidenceId", "accessedAt")} for source in record["sources"]]
                for key in ("slug", "city", "country", "civilization", "short_description", "historical_background", "heritage_status", "preservation_status", "unesco_status", "our_work_note"):
                    if isinstance(record.get(key), str) and record[key]:
                        clean[key] = record[key]
                if clean.get("slug") and not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", clean["slug"]):
                    raise ValueError("Explicit website slug is malformed; revise and review the record.")
                for key in ("model_3d_url", "video_url"):
                    if isinstance(record.get(key), str) and record[key]:
                        value = record[key]
                        if value.startswith("/") and not value.startswith("//") and not any(char.isspace() or ord(char) < 32 or char == chr(92) for char in value):
                            clean[key] = value
                        else:
                            clean[key] = normalize_url(value)
                for key in ("has_video", "our_work"):
                    if type(record.get(key)) is bool:
                        clean[key] = record[key]
                if isinstance(record.get("our_work_types"), list) and all(isinstance(value, str) for value in record["our_work_types"]):
                    clean["our_work_types"] = list(record["our_work_types"])
                for key in ("latitude", "longitude", "estimated_year"):
                    value = record.get(key)
                    if value is not None and type(value) in (int, float):
                        clean[key] = value
                if isinstance(record.get("decks"), list) and all(isinstance(deck, str) for deck in record["decks"]):
                    clean["decks"] = list(record["decks"])
                clean.update(status="approved", verification_status="approved")
                if not validate_site_record(clean, set(workflow.repository.index))["is_valid"]:
                    raise ValueError("Cleaned record did not pass the heritage schema validation.")
                item["included"] = True
                item["reason"] = "Explicit current approval; internal research/review fields removed."
                exported.append(clean)
            except (ValueError, TypeError, KeyError, OSError, PipelineError) as exc:
                item["reason"] = f"Approved record cannot be exported: {exc}"
        items.append(item)
    # Do not silently create ambiguous website routes for same-name records.
    def slug(record):
        return record.get("slug") or re.sub(r"[^a-z0-9]+", "-", record["name"].lower()).strip("-")
    slugs = Counter(slug(record) for record in exported)
    ambiguous = {record["id"] for record in exported if not slug(record) or slugs[slug(record)] > 1}
    exported = [record for record in exported if record["id"] not in ambiguous]
    for item in items:
        if item["id"] in ambiguous:
            item.update(included=False, reason="Empty or duplicate website slug; revise and review the record.")
    return exported, {"exported_at": utc_now_iso(), "input_records": len(records), "exported_records": len(exported), "items": items,
        "automatically_approved": 0, "published": False}
