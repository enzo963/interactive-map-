"""Field-level evidence with tier-based preferences and preserved disagreements."""
import copy
import json
import re
from collections import Counter

from .errors import PipelineError
from .utils import ensure_http_url
from .site_identity import governorate_key, normalize_name

TEXT_FIELDS = {"name", "governorate", "category", "period", "description", "unesco_status", "heritageStatus"}
MEDIA_FIELDS = {"coverImage", "galleryImages", "imageCredit", "mediaLicense"}


def _image_url(value):
    if not isinstance(value, str) or not value.strip() or value.startswith("//"):
        raise ValueError("Image addresses require a non-empty local path or public HTTP(S) URL.")
    if not value.startswith("/"):
        ensure_http_url(value)


def _validate_value(field, value):
    json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False).encode("utf-8")
    if value is None or (isinstance(value, str) and not value.strip()) or value == [] or value == {}:
        return "unknown"
    if field in TEXT_FIELDS and not isinstance(value, str):
        raise ValueError("Text fields require a string value.")
    if field in {"unesco", "has3D"} and type(value) is not bool:
        raise ValueError("Flags require a boolean value, not strings or numbers.")
    if field == "coverImage" and (not isinstance(value, dict) or not isinstance(value.get("src"), str) or not value["src"]):
        raise ValueError("Cover assertions require an image object with src.")
    if field == "coverImage":
        _image_url(value["src"])
    if field.split(".")[0] in MEDIA_FIELDS and "." in field and field.rsplit(".", 1)[1] in {"src", "url", "alt", "caption", "credit", "license"} and not isinstance(value, str):
        raise ValueError("Image metadata assertions require text.")
    if field in {"galleryImages", "alternativeNames"} and not isinstance(value, list):
        raise ValueError("This field requires an array value.")
    if field == "galleryImages":
        for image in value:
            if not isinstance(image, dict):
                raise ValueError("Gallery assertions require image objects with src.")
            _image_url(image.get("src"))
    if field == "alternativeNames" and any(not isinstance(item, str) or not item.strip() for item in value):
        raise ValueError("Alternative names must be non-empty strings.")
    if field.split(".")[0] in MEDIA_FIELDS and field.rsplit(".", 1)[-1] in {"src", "url"}:
        _image_url(value)
    return "known"


def _key(field, value):
    if isinstance(value, str) and field in {"name", "category", "period", "unesco_status", "heritageStatus"}:
        return json.dumps(["text", normalize_name(value)], ensure_ascii=False)
    if field == "governorate" and isinstance(value, str):
        return json.dumps(["governorate", governorate_key(value)])
    return json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False)


def _existing(site, field):
    value = site
    for token in field.split("."):
        if not isinstance(value, dict) or token not in value:
            return None
        value = value[token]
    return value


def build_evidence_view(site, claims, repository):
    """Return a new review record. No canonical field is overwritten.

    claims = {siteId, assertions:[{assertionId, field, value, evidenceId, locator}]}.
    Lower trust_tier is stronger. Equal-tier disagreement has no preferred value.
    Preferred means suggested for human review, never approved or established.
    """
    if not isinstance(site, dict) or not isinstance(site.get("id"), str) or not site["id"]:
        raise ValueError("Select one heritage record with a stable id.")
    if not isinstance(claims, dict) or claims.get("siteId") != site["id"] or not isinstance(claims.get("assertions"), list):
        raise ValueError("Claims must identify this siteId and contain an assertions array.")
    output = copy.deepcopy(site)
    assertions = []
    for entry in site.get("evidence_assertions", []) if isinstance(site.get("evidence_assertions"), list) else []:
        if isinstance(entry, dict) and "original_claim" in entry:
            assertions.append(copy.deepcopy(entry["original_claim"]))
    # Re-running the same claims is idempotent; changed claims with reused IDs
    # remain separate and are rejected together instead of erasing history.
    previous = copy.deepcopy(assertions)
    for claim in claims["assertions"]:
        if claim not in previous:
            assertions.append(copy.deepcopy(claim))
    counts = Counter(claim.get("assertionId") for claim in assertions if isinstance(claim, dict) and isinstance(claim.get("assertionId"), str))
    enriched, by_field, errors = [], {}, []
    sources = copy.deepcopy(site.get("sources")) if isinstance(site.get("sources"), list) else []
    refs = list(site.get("source_evidence")) if isinstance(site.get("source_evidence"), list) else []
    provenance = copy.deepcopy(site.get("provenance")) if isinstance(site.get("provenance"), dict) else {}
    for index, claim in enumerate(assertions):
        entry = {"input_index": index, "original_claim": copy.deepcopy(claim), "eligible": False, "issues": []}
        try:
            if not isinstance(claim, dict):
                raise ValueError("Assertion must be an object.")
            assertion_id = claim.get("assertionId")
            if not isinstance(assertion_id, str) or not assertion_id.strip() or counts[assertion_id] != 1:
                raise ValueError("A unique, non-empty assertionId is required.")
            field = claim.get("field")
            if not isinstance(field, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*", field):
                raise ValueError("Field must be a simple name or dotted field path.")
            if "value" not in claim:
                raise ValueError("Assertion value is missing.")
            state = _validate_value(field, claim["value"])
            ref = claim.get("evidenceId")
            if not isinstance(ref, str) or not ref:
                raise ValueError("A saved evidenceId is required.")
            citation, source = repository.resolve(ref, claim.get("locator"))
            if claim.get("sourceId", source.id) != source.id:
                raise ValueError("Claim sourceId disagrees with the evidence manifest.")
            media = field.split(".")[0] in MEDIA_FIELDS
            allowed = set(source.allowed_content)
            if media:
                if not allowed.intersection({"image_candidates", "image_metadata", "facts"}):
                    raise ValueError("Registered source does not support image-related content.")
            elif not allowed.intersection({"facts", "site_discovery", "descriptions", "coordinates", "unesco_status", "heritage_status", "heritage_programs"}):
                raise ValueError("Registered source supports images only, not historical/designation facts.")
            entry.update({"assertionId": assertion_id, "field": field, "value": copy.deepcopy(claim["value"]),
                          "locator": copy.deepcopy(claim["locator"]), **citation, "eligible": state == "known"})
            if state == "unknown":
                entry["issues"].append("Value is unknown and cannot influence preference.")
            if citation["recorded_trust_tier"] != citation["trust_tier"]:
                entry["issues"].append("Current registry tier differs from the snapshot tier; current policy controls preference.")
            by_field.setdefault(field, []).append(entry)
            if ref not in refs:
                refs.append(ref)
            if not any(isinstance(item, dict) and item.get("evidenceId") == ref for item in sources):
                sources.append(copy.deepcopy(citation))
            if entry["eligible"]:
                existing_refs = provenance.get(field)
                existing_refs = list(existing_refs) if isinstance(existing_refs, list) else []
                if ref not in existing_refs:
                    existing_refs.append(ref)
                provenance[field] = existing_refs
        except (ValueError, TypeError, KeyError, IndexError, OSError, RecursionError, PipelineError) as exc:
            entry["issues"].append(str(exc))
            errors.append({"input_index": index, "message": str(exc)})
        enriched.append(entry)
    field_evidence, conflicts = {}, []
    for field, entries in by_field.items():
        groups = {}
        for entry in entries:
            if not entry["eligible"]:
                continue
            key = _key(field, entry["value"])
            group = groups.setdefault(key, {"value": copy.deepcopy(entry["value"]), "assertionIds": [], "evidenceIds": [], "sourceIds": [], "best_trust_tier": entry["trust_tier"]})
            group["assertionIds"].append(entry["assertionId"])
            for list_key, item in (("evidenceIds", entry["evidenceId"]), ("sourceIds", entry["sourceId"])):
                if item not in group[list_key]:
                    group[list_key].append(item)
            group["best_trust_tier"] = min(group["best_trust_tier"], entry["trust_tier"])
        alternatives = sorted(groups.values(), key=lambda group: (group["best_trust_tier"], _key(field, group["value"])))
        strongest = [group for group in alternatives if group["best_trust_tier"] == alternatives[0]["best_trust_tier"]] if alternatives else []
        preferred = strongest[0] if len(strongest) == 1 else None
        conflict = len(alternatives) > 1
        existing = _existing(site, field)
        differs = preferred is not None and existing not in (None, "", []) and _key(field, existing) != _key(field, preferred["value"])
        status = "unknown" if not alternatives else "uncontested" if not conflict else "preferred-pending-review" if preferred else "tie-needs-review"
        field_evidence[field] = {"assertionIds": [entry["assertionId"] for entry in entries], "alternatives": alternatives,
                                 "preferred_value": copy.deepcopy(preferred["value"]) if preferred else None,
                                 "preferred_assertion_ids": list(preferred["assertionIds"]) if preferred else [],
                                 "existing_value": copy.deepcopy(existing), "differs_from_current": differs,
                                 "has_conflict": conflict, "resolution_status": status, "review_required": True}
        if conflict or differs:
            conflicts.append(field)
    verification = copy.deepcopy(output.get("verification")) if isinstance(output.get("verification"), dict) else {}
    verification.update({"status": "unverified", "review_required": True})
    output.update({"sources": sources, "source_evidence": refs, "provenance": provenance,
                   "evidence_assertions": enriched, "field_evidence": field_evidence,
                   "status": "needs-review", "verification": verification,
                   "reliability_review": {"policy": "Lower registry trust_tier is stronger; equal-tier disagreements remain unresolved.",
                                          "conflict_fields": conflicts, "invalid_assertions": errors,
                                          "has_conflicts": bool(conflicts), "manual_review_required": True,
                                          "automatically_approved": False}})
    return output
