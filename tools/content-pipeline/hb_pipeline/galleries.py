"""Build review-only galleries from site-specific, reachable image candidates."""
import copy
from urllib.parse import urlparse

from .errors import PipelineError
from .images import _association
from .image_licenses import license_state
from .utils import host_matches, normalize_url
from .validation import validate_image_association


def prepare_gallery(site, validator, known_sites=None):
    if not isinstance(site, dict) or not isinstance(site.get("id"), str) or not site["id"].strip():
        raise ValueError("Gallery preparation requires a site record with a stable id.")
    result = copy.deepcopy(site)
    original_gallery = copy.deepcopy(site.get("galleryImages", []))
    candidates = site.get("image_candidates", [])
    if not isinstance(candidates, list):
        raise ValueError("image_candidates must be an array.")
    refs = site.get("source_evidence", [])
    refs = refs if isinstance(refs, list) else []
    groups, skipped, checks = {}, [], []
    for index, candidate in enumerate(candidates):
        try:
            if not isinstance(candidate, dict):
                raise ValueError("Image candidate must be an object.")
            url = normalize_url(candidate.get("url"))
            groups.setdefault(url, []).append((index, candidate))
        except (ValueError, TypeError) as exc:
            skipped.append({"input_index": index, "reason": str(exc), "candidate": copy.deepcopy(candidate)})
    valid_groups = []
    for url, observations in groups.items():
        qualified, findings = [], []
        conflict = False
        restricted = any(license_state(candidate) == "restricted" for _, candidate in observations)
        for index, candidate in observations:
            try:
                contexts = candidate.get("contexts")
                if not isinstance(contexts, list) or any(not isinstance(item, dict) for item in contexts):
                    raise ValueError("Image-specific contexts are missing or malformed; review the site association.")
                sid, status, _, notes = _association(contexts, site, known_sites)
                conflict = conflict or status == "ambiguous" or (status == "unmatched" and any("other catalog sites" in note for note in notes)) or candidate.get("association_status") == "ambiguous"
                if candidate.get("siteId") != site["id"] or candidate.get("association_status") != "matched-unverified" or sid != site["id"]:
                    raise ValueError("Image lacks an explicit, unambiguous association with this siteId.")
                validate_image_association(candidate, set(refs))
                for field in ("alt", "caption", "credit", "license_hint", "license_url"):
                    if field in candidate and not isinstance(candidate[field], str):
                        raise ValueError(f"Image metadata {field} must be text.")
                if candidate.get("license_url"):
                    normalize_url(candidate["license_url"])
                source = validator.registry.get(candidate.get("source_id"))
                source_url = normalize_url(candidate.get("source_url"))
                if not host_matches(urlparse(source_url).hostname or "", source.domains):
                    raise ValueError("Candidate source page is outside the registered source domains.")
                if not set(source.allowed_content).intersection({"facts", "image_candidates", "image_metadata"}):
                    raise ValueError("Registered source is not permitted to supply image content.")
                qualified.append((index, candidate, source))
            except (ValueError, TypeError, KeyError, PipelineError) as exc:
                findings.append({"input_index": index, "reason": str(exc)})
        if conflict or restricted or not qualified:
            skipped.append({"url": url, "input_indices": [item[0] for item in observations],
                            "reason": "Restricted image licensing." if restricted else "Conflicting site identity across image observations." if conflict else "Unrelated, uncertain or invalid image association.",
                            "findings": findings, "observations": copy.deepcopy([item[1] for item in observations])})
            continue
        check = validator.validate(url, source=qualified[0][2].id, governorate=site.get("governorate"), evidence_id=qualified[0][1].get("evidenceId"))
        checks.append(copy.deepcopy(check))
        if not check["valid"]:
            skipped.append({"url": url, "reason": "Image URL/content validation failed.", "validation": copy.deepcopy(check),
                            "observations": copy.deepcopy([item[1] for item in observations])})
            continue
        valid_groups.append((check, qualified, observations, findings))
    # Different requested URLs may redirect to the same image. Deduplicate only
    # normalized final URL; meaningful transform/query parameters stay intact.
    finals = {}
    for check, qualified, observations, findings in valid_groups:
        key = normalize_url(check["final_url"])
        group = finals.setdefault(key, {"qualified": [], "observations": [], "checks": [], "findings": []})
        group["qualified"].extend(qualified)
        group["observations"].extend(item[1] for item in observations)
        group["checks"].append(check)
        group["findings"].extend(findings)
    gallery = []
    for url, group in finals.items():
        _, chosen, source = min(group["qualified"], key=lambda item: (item[2].trust_tier, item[0]))
        gallery.append({"src": url, "alt": chosen.get("alt", ""), "caption": chosen.get("caption", ""),
                        "credit": chosen.get("credit", ""), "license": chosen.get("license_hint", chosen.get("license", "")),
                        "license_url": chosen.get("license_url", ""), "license_status": license_state(chosen),
                        **{key: copy.deepcopy(chosen[key]) for key in ("license_review", "license_tracking", "publication_approval") if key in chosen},
                        "siteId": site["id"], "sourceId": source.id, "sourceName": source.name,
                        "sourceUrl": chosen["source_url"], "source": chosen.get("source", ""),
                        "evidenceId": chosen["evidenceId"], "evidenceIds": list(dict.fromkeys(item[1]["evidenceId"] for item in group["qualified"])),
                        "accessedAt": chosen.get("accessedAt"),
                        "source_observations": copy.deepcopy(group["observations"]),
                        "url_validation": copy.deepcopy(group["checks"]), "metadata_findings": group["findings"],
                        "width": group["checks"][0]["width"], "height": group["checks"][0]["height"],
                        "verification_status": "unverified", "review_required": True})
    result["galleryImages"] = gallery
    result["status"] = "needs-review"
    verification = copy.deepcopy(site.get("verification")) if isinstance(site.get("verification"), dict) else {}
    verification.update(status="unverified", review_required=True)
    result["verification"] = verification
    result["gallery_review"] = {"original_galleryImages": original_gallery, "network_checks": checks,
        "skipped_images": skipped, "candidate_count": len(candidates), "gallery_count": len(gallery),
        "duplicates_removed": sum(max(0, len(group["observations"]) - 1) for group in finals.values()),
        "manual_review_required": True, "automatically_approved": False,
        "notes": ["URL/content validity is a point-in-time technical check, not site identity or licensing approval.",
                  "All candidate/source observations and license hints are preserved; unknown licenses remain unverified.",
                  "Cover selection and frontend files are not updated by gallery preparation."]}
    provenance = copy.deepcopy(site.get("provenance")) if isinstance(site.get("provenance"), dict) else {}
    result["gallery_review"]["original_gallery_provenance"] = copy.deepcopy(provenance.get("galleryImages"))
    provenance["galleryImages"] = list(dict.fromkeys(candidate["evidenceId"] for group in finals.values() for _, candidate, _ in group["qualified"]))
    result["provenance"] = provenance
    return result


def flag_shared_site_images(records):
    """A final URL claimed by different sites requires explicit human review."""
    owners = {}
    for record in records:
        sid = record.get("id")
        if isinstance(sid, str):
            for image in record.get("galleryImages", []):
                owners.setdefault(image["src"], set()).add(sid)
    conflicts = {url: sorted(ids) for url, ids in owners.items() if len(ids) > 1}
    for record in records:
        review = record.get("gallery_review", {})
        retained = []
        for image in record.get("galleryImages", []):
            if image["src"] in conflicts:
                review.setdefault("skipped_images", []).append({"url": image["src"],
                    "reason": "Same final image URL is claimed by different sites; manual identity review required.",
                    "conflicting_siteIds": conflicts[image["src"]], "image": image})
            else:
                retained.append(image)
        record["galleryImages"] = retained
        if "gallery_count" in review:
            review["gallery_count"] = len(retained)
            record["provenance"]["galleryImages"] = list(dict.fromkeys(
                ref for image in retained for ref in image["evidenceIds"]))
    return conflicts
