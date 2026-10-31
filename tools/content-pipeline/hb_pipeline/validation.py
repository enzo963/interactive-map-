from __future__ import annotations

import re

from .errors import ValidationError
from .models import DraftRecord, PageExtraction
from .utils import ensure_http_url, normalize_url


def validate_extraction(extraction: PageExtraction) -> None:
    name = next((heading.strip() for heading in extraction.headings if heading.strip()), extraction.title.strip())
    if len(name) < 3:
        raise ValidationError("Extraction has no usable title or heading; no draft was saved.")
    blocked = ("access denied", "just a moment", "verify you are human", "403 forbidden", "404 not found", "page not found")
    if any(value in name.casefold() or value in extraction.title.casefold() for value in blocked):
        raise ValidationError("Extraction appears to be an error or access-challenge page; inspect the source manually.")
    if not any(len(text.strip()) >= 40 for text in [extraction.meta_description, *extraction.paragraphs]):
        raise ValidationError("Extraction needs a description or paragraph of at least 40 characters; no draft was saved.")
    if extraction.canonical_url:
        ensure_http_url(extraction.canonical_url)
    for image in extraction.image_candidates:
        ensure_http_url(image.get("url", ""))


def validate_draft(draft: DraftRecord, evidence_ids: set[str]) -> None:
    """Validate a newly generated review draft; never promote it to verified."""
    for field in ("draft_id", "governorate", "candidate_name", "candidate_summary"):
        value = getattr(draft, field)
        if not isinstance(value, str) or not value.strip():
            raise ValidationError(f"Draft field '{field}' must be a non-empty string.")
    if not re.fullmatch(r"draft-[a-zA-Z0-9][a-zA-Z0-9_-]*", draft.draft_id):
        raise ValidationError("Draft draft_id must be a safe identifier beginning with 'draft-'.")
    if len(draft.candidate_name.strip()) < 3 or len(draft.candidate_summary.strip()) < 40:
        raise ValidationError("Draft needs a usable candidate name and a summary of at least 40 characters.")
    if draft.status != "needs-review":
        raise ValidationError("New drafts must have status 'needs-review'.")
    if not isinstance(draft.verification, dict) or draft.verification.get("status") != "unverified" or draft.verification.get("review_required") is not True:
        raise ValidationError("Draft verification must remain unverified with review_required=true.")
    refs = draft.source_evidence
    if not isinstance(refs, list) or not refs or any(not isinstance(ref, str) or ref not in evidence_ids for ref in refs) or len(set(refs)) != len(refs):
        raise ValidationError("Draft source_evidence must contain unique references to known evidence.")
    if not isinstance(draft.provenance, dict):
        raise ValidationError("Draft provenance must be a field-to-evidence mapping.")
    for field in ("candidate_name", "candidate_summary", "image_candidates"):
        values = draft.provenance.get(field)
        required = bool(getattr(draft, field))
        if not isinstance(values, list) or (required and not values) or any(not isinstance(ref, str) or ref not in refs for ref in values):
            raise ValidationError(f"Draft provenance for '{field}' must reference its source_evidence.")
    if not isinstance(draft.image_candidates, list):
        raise ValidationError("Draft image_candidates must be a list.")
    seen = set()
    for index, image in enumerate(draft.image_candidates):
        if not isinstance(image, dict):
            raise ValidationError(f"Draft image_candidates[{index}] must be an object.")
        try:
            url = normalize_url(image.get("url", ""))
        except ValueError as exc:
            raise ValidationError(f"Draft image_candidates[{index}]: {exc}") from exc
        if url in seen:
            raise ValidationError(f"Draft image_candidates[{index}] duplicates an earlier image URL.")
        seen.add(url)
        if image.get("license_status") != "unverified":
            raise ValidationError(f"Draft image_candidates[{index}] license must remain unverified.")
