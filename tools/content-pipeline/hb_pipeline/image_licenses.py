"""Image-specific licensing evidence; never infer reuse permission from trust or HTTP."""
import copy

from .errors import PipelineError
from .site_validation import valid_access_date
from .utils import normalize_url

LICENSE_STATES = {"verified", "unverified", "restricted", "unknown"}


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def image_url(image):
    return normalize_url(image.get("src") or image.get("url"))


def _same_url(value, expected):
    try:
        return normalize_url(value) == expected
    except (ValueError, TypeError):
        return False


def review_complete(image):
    review = image.get("license_review")
    try:
        url = image_url(image)
    except (ValueError, TypeError):
        return False
    return (isinstance(review, dict) and review.get("permission") == "publication-permitted"
            and _text(review.get("reviewedBy")) and valid_access_date(review.get("reviewedAt"))
            and _text(review.get("license")) and _same_url(review.get("image_url"), url)
            and isinstance(review.get("evidence"), list) and bool(review["evidence"]))


def license_state(image):
    """Read a state conservatively without creating a verification or approval."""
    state = image.get("license_status")
    review = image.get("license_review", {})
    if state == "restricted" or (isinstance(review, dict) and review.get("permission") == "restricted"):
        return "restricted"
    if state == "verified":
        tracking = image.get("license_tracking")
        if (review_complete(image) and isinstance(tracking, dict) and tracking.get("evidence_valid") is True
            and isinstance(tracking.get("evidence_checks"), list) and tracking["evidence_checks"]
            and all(isinstance(check, dict) and check.get("valid") is True for check in tracking["evidence_checks"])):
            return "verified"
        return "unverified"
    if isinstance(state, str) and state in {"unknown", "unverified"}:
        return state
    return "unverified" if any(_text(image.get(key)) for key in ("license", "license_hint", "license_url")) or review else "unknown"


def track_license(image, repository):
    """Validate an existing human review; preserve input claims and all evidence."""
    output = copy.deepcopy(image)
    claimed = image.get("license_status")
    state = license_state(image)
    issues, checks = [], []
    if claimed is not None and (not isinstance(claimed, str) or claimed not in LICENSE_STATES):
        issues.append("Invalid license_status; expected verified, unverified, restricted or unknown.")
    evidence_valid = False
    if claimed == "verified" and state != "restricted":
        if not review_complete(image):
            issues.append("Verified licensing requires a named, dated human review, an image-bound permission decision and saved evidence.")
        else:
            url = image_url(image)
            for evidence in image["license_review"]["evidence"]:
                try:
                    if not isinstance(evidence, dict) or not _same_url(evidence.get("image_url"), url):
                        raise ValueError("License evidence must identify this exact image URL.")
                    citation, _ = repository.resolve(evidence.get("evidenceId"), evidence.get("locator"))
                    if not _same_url(evidence.get("source_url"), citation["url"]):
                        raise ValueError("License evidence source URL differs from the saved capture.")
                    locator = evidence.get("image_locator")
                    if not isinstance(locator, dict) or not _same_url(locator.get("text_match"), url):
                        raise ValueError("License evidence requires a locator identifying the exact image in the same capture.")
                    repository.resolve(evidence.get("evidenceId"), locator)
                    checks.append({"valid": True, "source": citation, "original_evidence": copy.deepcopy(evidence)})
                except (ValueError, TypeError, KeyError, IndexError, OSError, PipelineError) as exc:
                    checks.append({"valid": False, "original_evidence": copy.deepcopy(evidence), "reason": str(exc)})
                    issues.append(str(exc))
            evidence_valid = bool(checks) and all(check["valid"] for check in checks)
        state = "verified" if evidence_valid else "unverified"
    if state == "restricted":
        issues.append("Publication is restricted; retain the image for review and exclude it from automatic media selection.")
    reported_flags = {key: output.pop(key) for key in ("safe_for_publication", "publication_safe") if key in output}
    output["license_status"] = state
    output["license_tracking"] = {"reported_status": claimed, "reported_publication_flags": reported_flags, "evidence_valid": evidence_valid,
        "evidence_checks": checks, "issues": issues, "automatically_approved": False,
        "notes": ["A reviewer must determine rights and applicable conditions; text matching only verifies provenance.",
                  "License verification is separate from image identity and explicit publication approval."]}
    # Never synthesize publication_approval or a safe-for-publication flag.
    return output


def track_record_images(record, repository):
    """Audit every nested image occurrence in a copy; leave source citations alone."""
    counts = {state: 0 for state in sorted(LICENSE_STATES)}
    def visit(value):
        if isinstance(value, list):
            return [visit(item) for item in value]
        if not isinstance(value, dict):
            return copy.deepcopy(value)
        result = {key: visit(item) for key, item in value.items() if key != "license_tracking"}
        is_image = ("src" in value or "url" in value) and any(key in value for key in ("license_status", "contexts", "alt", "caption"))
        if is_image:
            # Existing tracking does not bypass fresh evidence checks.
            if "license_tracking" in value:
                result["license_tracking"] = copy.deepcopy(value["license_tracking"])
            result = track_license(result, repository)
            counts[result["license_status"]] += 1
        elif "license_tracking" in value:
            result["license_tracking"] = copy.deepcopy(value["license_tracking"])
        return result
    output = visit(record)
    return output, counts
