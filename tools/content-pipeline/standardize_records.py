"""Standardize site-focused review drafts without publishing them to the frontend.

Run after collection: python standardize_records.py
Raw, extracted and evidence files are not modified. Automatic page drafts are
research artifacts and are intentionally not converted into heritage sites.
"""
from __future__ import annotations

import json
import re
from dataclasses import fields
from pathlib import Path

from hb_pipeline.models import DraftRecord
from hb_pipeline.storage import Storage
from hb_pipeline.utils import utc_now_iso
from hb_pipeline.validation import validate_draft

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REQUIRED = ("id", "name", "governorate", "category", "period", "description", "unesco", "has3D", "coverImage", "galleryImages", "sources")
GOVERNORATES = {"erbil": "Erbil", "duhok": "Duhok", "sulaymaniyah": "Sulaymaniyah", "nineveh": "Nineveh", "kirkuk": "Kirkuk"}
# Broad classifications supported by the captured site descriptions. Unknown
# chronological fields stay empty rather than inventing a precise date.
CLASSIFICATIONS = {
 "erbil-citadel": ("Citadel", ""), "choli-minaret": ("Minaret", ""),
 "shanidar-cave": ("Archaeological Cave", ""), "amedy-city": ("Historic City", ""),
 "delal-bridge": ("Historic Bridge", ""), "faida-canal-reliefs": ("Archaeological Site", "Assyrian"),
 "hatra": ("Archaeological Site", "Parthian"), "ancient-nineveh": ("Archaeological City", "Assyrian"),
 "nimrud": ("Archaeological City", "Assyrian"), "old-mosul": ("Historic Urban Area", ""),
 "lalish": ("Religious Complex", ""), "al-nouri": ("Mosque and Minaret", ""),
 "dominican-church": ("Church", ""), "bestansur": ("Archaeological Settlement", "Early Neolithic"),
 "qalatga-darband": ("Archaeological City", "Hellenistic"), "tell-shemshara": ("Archaeological Settlement", ""),
 "kirkuk-citadel": ("Citadel", ""), "green-dome": ("Historic Monument", ""),
 "prophet-daniel-mosque": ("Mosque", ""), "mother-of-sorrows-church": ("Church", ""),
}


def standardize(storage: Storage | None = None, frontend: list[dict] | None = None) -> dict:
    storage = storage or Storage()
    if frontend is None:
        frontend = json.loads((PROJECT_ROOT / "src/data/sites.json").read_text(encoding="utf-8"))
    existing_ids = {record["id"] for record in frontend}
    catalog = {record["id"]: record.copy() for record in frontend}
    evidence = {}
    for path in storage.raw_dir.rglob("*.evidence.json"):
        record = json.loads(path.read_text(encoding="utf-8"))
        evidence[record["evidence_id"]] = record
    core = {field.name for field in fields(DraftRecord)}
    paths = []
    seen = set()
    for path in sorted(storage.drafts_dir.glob("*/*-p50[1-5]-*.json")):
        draft = json.loads(path.read_text(encoding="utf-8"))
        validate_draft(DraftRecord(**{key: draft[key] for key in core}), set(evidence))
        match = re.fullmatch(r"draft-(.+)-p50[1-5]-[0-9]{8}", draft["draft_id"])
        if not match:
            raise ValueError(f"Unsupported site draft ID: {path}")
        slug = match[1]
        governorate_key = path.parent.name
        governorate = GOVERNORATES.get(governorate_key, draft["governorate"])
        existing = draft.get("possible_existing_frontend_record_id")
        record_id = draft.get("id") or (existing if existing in existing_ids else f"site-{governorate_key}-{slug}")
        if record_id in seen:
            raise ValueError(f"Duplicate site ID {record_id}: {path}")
        seen.add(record_id)
        category, period = CLASSIFICATIONS.get(slug, ("", ""))
        # Only captured inscription/tentative evidence determines this flag.
        context = draft.get("unesco_context", {}).get("status")
        if context is None and slug == "erbil-citadel":
            context = "inscribed"  # captured UNESCO property 1437
        unesco = True if context == "inscribed" else False if context == "tentative" else None
        sources = draft.get("sources") or [
            {"sourceName": evidence[ref]["source_name"], "url": evidence[ref]["final_url"],
             "evidenceId": ref, "accessedAt": evidence[ref]["retrieved_at"]}
            for ref in draft["source_evidence"]
        ]
        canonical = {
            "id": record_id, "name": draft["candidate_name"], "governorate": governorate,
            "category": draft.get("category", category), "period": draft.get("period", period),
            "description": draft["candidate_summary"], "unesco": draft.get("unesco", unesco),
            "has3D": draft.get("has3D"), "coverImage": draft.get("coverImage"),
            "galleryImages": draft.get("galleryImages", []), "sources": sources,
        }
        # Keep review status, evidence, locators, citations and candidate fields.
        updated = {**canonical, **{key: value for key, value in draft.items() if key not in REQUIRED}}
        validate_draft(DraftRecord(**{key: updated[key] for key in core}), set(evidence))
        storage.save_json(path, updated)
        catalog[record_id] = updated
        paths.append(str(path.relative_to(storage.base_dir.parent)))
    records = sorted(catalog.values(), key=lambda item: (item["governorate"], item["name"]))
    prepared = storage.base_dir / "prepared" / "heritage-sites.json"
    storage.save_json(prepared, records)
    manifest = {
        "task": "P5-06", "completed_at": utc_now_iso(), "required_fields": list(REQUIRED),
        "site_drafts_standardized": len(paths), "frontend_records_standardized": len(frontend),
        "unique_review_records": len(records), "prepared_catalog": str(prepared.relative_to(storage.base_dir.parent)),
        "draft_paths": paths, "published": False,
        "notes": ["Automatic page drafts, raw snapshots, extractions and evidence manifests retain their own research schemas.",
                  "Unknown UNESCO and 3D flags stay null; no false absence claims are inferred.",
                  "Hatra uses existing ID site-001 to avoid duplicating that frontend identity in the review catalog.",
                  "Prepared records remain unpublished. Existing frontend content is not replaced by review drafts."],
    }
    storage.save_json(storage.logs_dir / "heritage-schema-p506-20261031.json", manifest)
    return manifest


if __name__ == "__main__":
    result = standardize()
    print(f"Standardized {result['site_drafts_standardized']} site drafts and {result['frontend_records_standardized']} frontend record(s).")
    print(f"Unpublished review catalog: {result['unique_review_records']} unique records.")
