"""Website-facing JSON from current explicit human decisions; no publication step."""
import copy
import re
from collections import Counter
from datetime import date

from .errors import PipelineError
from .image_licenses import track_license, license_state
from .review_workflow import record_id
from .site_validation import REQUIRED_FIELDS, validate_site_record, valid_access_date
from .utils import normalize_url, utc_now_iso


# Public optional-resource fields are intentionally independent of workflow approval.
# Exporting a reviewed site must neither approve its assets nor erase negative gates.
_MODEL_FIELDS = (
    "id", "title", "siteId", "site_id", "creator", "creationMethod", "creation_method",
    "year", "creation_year", "format", "fileSizeBytes", "file_size_bytes",
    "verificationStatus", "verification_status", "verified",
)
_ASSET_FIELDS = ("type", "name", "title", "description", "format", "siteId", "site_id",
    "verificationStatus", "verification_status", "verified")
_MODEL_TYPES = {"3d", "3d-model", "model", "reconstruction", "digital-reconstruction"}
_RIGHTS_FIELDS = ("credit", "license", "licence", "license_status", "licenseStatus", "sourceName", "source_name")
_REVIEW_FIELDS = ("permission", "reviewedBy", "reviewedAt", "license")
_URL_FIELDS = ("sourceUrl", "source_url", "license_url")


def _public_url(value, relative=True):
    if not isinstance(value, str) or not value or any(char.isspace() or ord(char) < 32 or ord(char) == 127 or char == "\\" for char in value):
        return ""
    if value.startswith("/"):
        # Use the same conservative escape checks as absolute pipeline URLs.
        if not relative or value.startswith("//") or re.search(r"%(?![0-9a-fA-F]{2})|%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)", value, re.I):
            return ""
        return value
    try:
        return normalize_url(value)
    except (ValueError, TypeError):
        return ""


def _public_fields(value, names):
    # Nested objects always pass through their own allowlist, never a deep copy.
    return {key: copy.deepcopy(value[key]) for key in names
        if key in value and (value[key] is None or type(value[key]) in (str, int, float, bool))}


def _public_rights(value):
    clean = _public_fields(value, _RIGHTS_FIELDS)
    for key in ("license_status", "licenseStatus"):
        if key in value and value[key] is not None and type(value[key]) not in (str, bool):
            clean[key] = "unknown"
    for key in _URL_FIELDS:
        if key in value:
            clean[key] = _public_url(value[key], relative=False)
            if key in ("sourceUrl", "source_url") and value[key] and not clean[key]:
                # Clearing a bad source must not remove a failed licensing binding check.
                if clean.get("license_status") != "restricted":
                    clean["license_status"] = "unverified"
    review = value.get("license_review")
    if isinstance(review, dict):
        clean["license_review"] = _public_fields(review, _REVIEW_FIELDS)
        for key in ("image_url", "resource_url"):
            if key in review:
                clean["license_review"][key] = _public_url(review[key])
        if isinstance(review.get("evidence"), list):
            clean["license_review"]["evidence"] = []
            for entry in review["evidence"]:
                if not isinstance(entry, dict):
                    # An invalid proof must remain invalid, rather than disappear.
                    clean["license_review"]["evidence"].append(None)
                    continue
                proof = _public_fields(entry, ("evidenceId",))
                for key in ("source_url", "image_url", "resource_url"):
                    if key in entry:
                        proof[key] = _public_url(entry[key], relative=key != "source_url")
                clean["license_review"]["evidence"].append(proof)
    tracking = value.get("license_tracking")
    if isinstance(tracking, dict):
        clean["license_tracking"] = _public_fields(tracking, ("evidence_valid", "automatically_approved"))
        if isinstance(tracking.get("evidence_checks"), list):
            checks = clean["license_tracking"]["evidence_checks"] = []
            for entry in tracking["evidence_checks"]:
                if not isinstance(entry, dict):
                    checks.append(None)
                    continue
                check = _public_fields(entry, ("valid",))
                if isinstance(entry.get("source"), dict):
                    source = entry["source"]
                    check["source"] = _public_fields(source, ("sourceName", "evidenceId", "accessedAt"))
                    if "url" in source:
                        check["source"]["url"] = _public_url(source["url"], relative=False)
                checks.append(check)
    approval = value.get("publication_approval")
    if isinstance(approval, dict):
        clean["publication_approval"] = _public_fields(approval, ("status", "siteId", "site_verified", "reviewedBy", "reviewedAt"))
        for key in ("image_url", "resource_url"):
            if key in approval:
                clean["publication_approval"][key] = _public_url(approval[key])
    return clean


def _public_resource(value, fields, require_url=False):
    if not isinstance(value, dict):
        return None
    # Omitting malformed explicit gate values could accidentally turn them into legacy approval.
    gates = ("siteId", "site_id", "verificationStatus", "verification_status", "verified", "license_status", "licenseStatus")
    if any(key in value and value[key] is not None and type(value[key]) not in (str, bool) for key in gates):
        return None
    clean = _public_fields(value, fields)
    clean.update(_public_rights(value))
    for key in ("url", "src", "href"):
        if key in value:
            clean[key] = _public_url(value[key])
    if require_url and not any(clean.get(key) for key in ("url", "src", "href")):
        return None
    if isinstance(value.get("source_observations"), list):
        clean["source_observations"] = [_public_rights(item) for item in value["source_observations"] if isinstance(item, dict)]
    for key in ("fileSizeBytes", "file_size_bytes"):
        if key in clean and (type(clean[key]) is not int or not 0 <= clean[key] <= 9007199254740991):
            clean[key] = None
    for key in ("year", "creation_year"):
        if key in clean and (type(clean[key]) is not int or not 1 <= clean[key] <= 9999):
            clean[key] = None
    return clean


def _public_projects(projects):
    output = []
    for project in projects:
        clean = _public_resource(project, ("id", "title", "siteId", "verificationStatus", "verification_status",
            "verified", "our_work", "status", "creator", "organization", "method", "year", "description"))
        if clean is None:
            continue
        for key in ("modelUrls", "photographUrls"):
            if isinstance(project.get(key), list):
                clean[key] = [url for value in project[key] if (url := _public_url(value))]
        if isinstance(project.get("documentation"), list):
            clean["documentation"] = [document for value in project["documentation"]
                if (document := _public_resource(value, _ASSET_FIELDS, require_url=True)) is not None]
        if isinstance(project.get("reconstruction"), dict):
            clean["reconstruction"] = _public_fields(project["reconstruction"], ("description", "evidence", "uncertainties"))
        output.append(clean)
    return output


def _public_comparisons(comparisons):
    output = []
    for pair in comparisons:
        clean = _public_resource(pair, ("id", "title", "siteId", "type", "verificationStatus", "verification_status", "verified", "notes"))
        if clean is None:
            continue
        for key in ("before", "after"):
            side = pair.get(key)
            if not isinstance(side, dict) or not (url := _public_url(side.get("image"))):
                break
            clean[key] = {**_public_fields(side, ("label", "date", "kind")), "image": url}
        else:
            output.append(clean)
    return output


_CLAIM_FIELDS = ("siteId", "verification_status", "verificationStatus", "verified", "reviewedBy", "reviewedAt")
_PRESERVATION_STATES = {"preserved", "restored", "damaged", "heavily-damaged", "reconstructed",
    "endangered", "destroyed", "lost", "disappeared", "unknown"}
_STORY_TYPES = {"history", "architecture", "significance", "restoration", "destruction", "digital-documentation"}
_EVENT_TYPES = {"construction", "renovation", "destruction", "excavation", "restoration", "reconstruction", "unesco-inscription", "damage"}


def _public_heritage_claim(value, kind):
    """Copy typed authored claims; site approval never approves individual claims.

    Reject malformed gates as a unit, so removing an invalid conflicting gate or
    source reference cannot accidentally make the remaining claim publishable.
    Source IDs remain references and are never expanded into evidence or approval.
    """
    if not isinstance(value, dict):
        return None
    for key in ("siteId", "verification_status", "reviewedBy", "reviewedAt"):
        if not isinstance(value.get(key), str) or not value[key].strip():
            return None
    if not valid_access_date(value["reviewedAt"]):
        return None
    if "verificationStatus" in value and not isinstance(value["verificationStatus"], str):
        return None
    if "verified" in value and type(value["verified"]) is not bool:
        return None
    refs = value.get("sourceRefs")
    if (not isinstance(refs, list) or not refs
        or any(not isinstance(ref, str) or not ref.strip() for ref in refs)
        or len(set(refs)) != len(refs)):
        return None
    fields = {"preservation": ("state", "asOf", "summary"),
        "story": ("id", "type", "text"),
        "event": ("id", "type", "title", "description", "year", "endYear", "precision", "date")}[kind]
    required = {"preservation": ("state", "summary"), "story": ("id", "type", "text"),
        "event": ("id", "type", "title", "year")}[kind]
    if any(key not in value for key in required):
        return None
    for key in fields:
        if key not in value:
            continue
        item = value[key]
        if key in ("asOf", "date"):
            if item is not None and not valid_access_date(item):
                return None
        elif key in ("year", "endYear"):
            if key == "endYear" and item is None:
                continue
            if type(item) is not int or not -9999 <= item <= 9999 or item == 0:
                return None
        elif not isinstance(item, str):
            return None
    if kind == "preservation" and value["state"] not in _PRESERVATION_STATES:
        return None
    if kind != "preservation" and (not value["id"].strip() or value["type"] not in (_STORY_TYPES if kind == "story" else _EVENT_TYPES)):
        return None
    if kind == "event" and (not value["title"].strip() or ("precision" in value and value["precision"] not in {"exact", "approximate"})):
        return None
    clean = _public_fields(value, _CLAIM_FIELDS + fields)
    clean["sourceRefs"] = list(refs)
    return clean


def _optional_resources(record, clean):
    if "preservation" in record:
        # Keep an explicit failed primary assessment from falling back to legacy text.
        clean["preservation"] = _public_heritage_claim(record["preservation"], "preservation") or {"state": "unknown", "verified": False}
    for field, kind in (("story_sections", "story"), ("historical_events", "event")):
        if isinstance(record.get(field), list):
            clean[field] = [claim for value in record[field] if (claim := _public_heritage_claim(value, kind)) is not None]
    if isinstance(record.get("documentation"), dict):
        clean["documentation"] = {key: copy.deepcopy(value) for key, value in record["documentation"].items()
            if key in ("date", "team", "methods", "method", "equipment", "notes")
            and (isinstance(value, str) or (isinstance(value, list) and all(isinstance(item, str) for item in value)))}
    if isinstance(record.get("model_metadata"), dict):
        metadata = _public_resource(record["model_metadata"], _MODEL_FIELDS)
        if metadata is not None:
            clean["model_metadata"] = metadata
        else:
            # A malformed explicit primary gate must not disappear into the legacy has3D path.
            clean["model_metadata"] = {"verified": False}
    if isinstance(record.get("digital_assets"), list):
        clean["digital_assets"] = []
        for asset in record["digital_assets"]:
            fields = _ASSET_FIELDS + (_MODEL_FIELDS if isinstance(asset, dict) and str(asset.get("type", "")).lower() in _MODEL_TYPES else ())
            prepared = _public_resource(asset, fields, require_url=True)
            if prepared is not None:
                clean["digital_assets"].append(prepared)
    if isinstance(record.get("photogrammetry_projects"), list):
        clean["photogrammetry_projects"] = _public_projects(record["photogrammetry_projects"])
    if isinstance(record.get("comparisons"), list):
        clean["comparisons"] = _public_comparisons(record["comparisons"])


_IMAGE_MEDIA_TYPES = {"photograph", "archival-image", "reconstruction", "panorama"}
_MEDIA_FIELDS = ("id", "type", "title", "description", "creator", "date", "year", "alt", "caption",
    "creationMethod", "format", "fileSizeBytes")


def _safe_media_text(value):
    return isinstance(value, str) and not any(char in "<>" or ord(char) < 32 or ord(char) == 127 for char in value)


def _public_heritage_media(value):
    """Allowlist claim and rights metadata separately; neither approves the other."""
    if not isinstance(value, dict) or value.get("type") not in _IMAGE_MEDIA_TYPES | {"video", "3d"}:
        return None
    for key in ("id", "title", "siteId", "reviewedBy", "reviewedAt"):
        if not _safe_media_text(value.get(key)) or not value[key].strip():
            return None
    if not valid_access_date(value["reviewedAt"]):
        return None
    statuses = [key for key in ("verification_status", "verificationStatus") if key in value]
    if not statuses or any(not isinstance(value[key], str) for key in statuses):
        return None
    if "verified" in value and type(value["verified"]) is not bool:
        return None
    refs = value.get("sourceRefs")
    if (not isinstance(refs, list) or not refs or any(not isinstance(ref, str) or not ref.strip() for ref in refs)
        or len(set(refs)) != len(refs)):
        return None
    for key in ("description", "creator", "date", "alt", "caption", "creationMethod", "format"):
        if key in value and value[key] is not None and not _safe_media_text(value[key]):
            return None
    historic_date = value.get("date")
    if historic_date is not None:
        if not historic_date.strip():
            return None
        if re.fullmatch(r"\d{4}(?:-\d{2}){0,2}", historic_date.strip()):
            try:
                parts = historic_date.strip().split("-")
                authored = date.fromisoformat("-".join(parts + ["01"] * (3 - len(parts))))
                if authored > date.today() or (value.get("year") is not None and authored.year != value["year"]):
                    return None
            except ValueError:
                return None
    year = value.get("year")
    if year is not None and (type(year) is not int or year == 0 or not -9999 <= year <= date.today().year):
        return None
    # _public_resource preserves every explicit negative gate and structured rights proof.
    clean = _public_resource(value, _CLAIM_FIELDS + _MEDIA_FIELDS, require_url=True)
    if clean is None:
        return None
    if "year" in value:
        clean["year"] = year  # Historical media allows BCE; generic model years do not.
    clean["sourceRefs"] = list(refs)
    return clean


def _export_heritage_media(record, clean, repository, omissions, blocked):
    if not isinstance(record.get("heritage_media"), list):
        return
    clean["heritage_media"] = []
    for index, value in enumerate(record["heritage_media"]):
        prepared = _public_heritage_media(value)
        if prepared is None:
            continue
        if value["type"] in _IMAGE_MEDIA_TYPES:
            # Use the exact image registry audit, including saved locators and publication binding.
            image = {**value, "src": value.get("src") or value.get("url")}
            if _url_key(image) in blocked:
                audited, error = None, blocked[_url_key(image)]
            else:
                audited, error = _image(image, record["id"], repository)
            if error:
                omissions.append({"field": f"heritage_media[{index}]", "reason": error})
                continue
            prepared.update(audited)
        clean["heritage_media"].append(prepared)


def _url_key(image):
    try:
        return normalize_url(image.get("src")) if isinstance(image, dict) else None
    except (ValueError, TypeError):
        return None


def _known_failure(image):
    checks = image.get("url_validation", [])
    checks = checks if isinstance(checks, list) else [checks]
    return any(isinstance(check, dict) and check.get("valid") is False for check in checks)


def _restricted_image(image):
    observations = image.get("source_observations", [])
    observations = observations if isinstance(observations, list) else []
    return any(isinstance(value, dict) and (license_state(value) == "restricted" or value.get("licenseStatus") == "restricted")
        for value in [image, *observations])


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
                media_values = record.get("heritage_media", [])
                typed_images = [{**value, "src": value.get("src") or value.get("url")}
                    for value in (media_values if isinstance(media_values, list) else [])
                    if isinstance(value, dict) and value.get("type") in _IMAGE_MEDIA_TYPES and value.get("siteId") == rid]
                for image in [record.get("coverImage"), *record.get("galleryImages", []), *typed_images]:
                    if isinstance(image, dict) and (_restricted_image(image) or _known_failure(image)):
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
                for source, public_source in zip(record["sources"], clean["sources"]):
                    # Preserve explicit access and classification without inferring full text
                    # from ledger approval, evidence presence or the source's URL.
                    if source.get("accessLevel") in ("full-text", "search-snippet"):
                        public_source["accessLevel"] = source["accessLevel"]
                    for key in ("sourceType", "sourceTypeNote"):
                        if isinstance(source.get(key), str):
                            public_source[key] = source[key]
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
                _optional_resources(record, clean)
                _export_heritage_media(record, clean, workflow.repository, item["media_omissions"], blocked)
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
