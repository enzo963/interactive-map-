"""Possible site matches only. Never merge, delete, rename or approve records."""
from difflib import SequenceMatcher
from itertools import combinations

from .site_identity import governorate_key, normalize_name, site_names, source_urls


def _identities(record):
    return {value for key in ("id", "draft_id") if isinstance((value := record.get(key)), str) and value}


def _related(left, right):
    a, b = left.get("parent_draft_id"), right.get("parent_draft_id")
    return (isinstance(a, str) and (a in _identities(right) or (a and a == b))) or (isinstance(b, str) and b in _identities(left))


def _distinct_sections(left, right):
    def locators(record):
        result = {}
        values = record.get("evidence_locations")
        if not isinstance(values, list):
            return result
        for value in values:
            if not isinstance(value, dict) or not isinstance(value.get("evidenceId"), str):
                continue
            locator = tuple(str(value.get(key, "")) for key in ("artifact", "json_pointer", "selector", "text_match"))
            if any(locator):
                result.setdefault(value["evidenceId"], set()).add(locator)
        return result
    a, b = locators(left), locators(right)
    shared = a.keys() & b.keys()
    return bool(shared) and all(a[key].isdisjoint(b[key]) for key in shared)


def detect_possible_duplicates(records, similarity_threshold=0.9):
    """Return index-based candidate pairs. Inputs are never changed.

    Exact/alternative names require matching governorates. A shared URL can
    support a name match across conflicting governorate assignments. Shared
    URLs alone are low-confidence signals; declared related landmarks and
    distinct evidence sections suppress URL-only candidates.
    """
    if not 0 <= similarity_threshold <= 1:
        raise ValueError("similarity_threshold must be between 0 and 1")
    prepared = []
    for index, record in enumerate(records):
        if isinstance(record, dict):
            prepared.append((index, record, site_names(record), governorate_key(record.get("governorate")), source_urls(record)))
    pairs = []
    for a, b in combinations(prepared, 2):
        left_index, left, left_names, left_gov, left_urls = a
        right_index, right, right_names, right_gov, right_urls = b
        same_gov = bool(left_gov) and left_gov == right_gov
        shared_urls = sorted(left_urls & right_urls)
        overlap = sorted(left_names & right_names)
        reasons = []
        confidence = "low"
        left_id, right_id = left.get("id"), right.get("id")
        if isinstance(left_id, str) and left_id.strip() and left_id == right_id:
            reasons.append("same_id")
            confidence = "high"
        if overlap and (same_gov or shared_urls):
            primary_same = normalize_name(left.get("name")) == normalize_name(right.get("name"))
            reasons.append("same_name" if primary_same else "alternative_name")
            confidence = "high"
        fuzzy = None
        if not overlap and same_gov:
            scores = [(SequenceMatcher(None, x, y, autojunk=False).ratio(), x, y) for x in left_names for y in right_names if min(len(x), len(y)) >= 6]
            if scores:
                score, x, y = max(scores)
                if score >= similarity_threshold:
                    reasons.append("similar_name")
                    confidence = "medium" if confidence != "high" else confidence
                    fuzzy = {"left": x, "right": y, "similarity": round(score, 4)}
        url_only_allowed = same_gov and not _related(left, right) and not _distinct_sections(left, right)
        if shared_urls and (reasons or url_only_allowed):
            reasons.append("shared_source_url")
        if not reasons:
            continue
        pairs.append({"left_index": left_index, "right_index": right_index, "confidence": confidence,
                      "reasons": reasons, "matched_names": overlap, "similar_name": fuzzy,
                      "shared_source_urls": shared_urls,
                      "governorate_conflict": bool(left_gov and right_gov and left_gov != right_gov),
                      "review_required": True})
    return pairs
