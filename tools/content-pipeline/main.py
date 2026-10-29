from __future__ import annotations

import argparse
import json
import sys

from hb_pipeline.config import SourceRegistry
from hb_pipeline.diagnostics import diagnose_url
from hb_pipeline.errors import PipelineError
from hb_pipeline.extractor import extract_page
from hb_pipeline.fetcher import TrustedFetcher
from hb_pipeline.models import DraftRecord, EvidenceRecord
from hb_pipeline.storage import Storage
from hb_pipeline.utils import (
    sha256_bytes,
    slugify,
    timestamp_slug,
    utc_now_iso,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Heritage Bridge trusted-content pipeline — Phase 1.1"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("sources", help="List configured trusted sources.")

    check = sub.add_parser(
        "check",
        help="Diagnose domain and robots policy before fetching.",
    )
    check.add_argument("--source", required=True, help="Trusted source id.")
    check.add_argument("--url", required=True, help="Absolute URL to diagnose.")

    fetch = sub.add_parser(
        "fetch",
        help="Fetch and snapshot one trusted HTML page when allowed.",
    )
    fetch.add_argument("--source", required=True, help="Trusted source id.")
    fetch.add_argument("--governorate", required=True, help="Governorate key/name.")
    fetch.add_argument("--url", required=True, help="Absolute trusted page URL.")

    return parser


def list_sources(registry: SourceRegistry) -> int:
    for source in registry.all():
        print(
            f"{source.id:20} "
            f"tier={source.trust_tier} "
            f"domains={','.join(source.domains)}"
        )
    return 0


def check_url(
    registry: SourceRegistry,
    source_id: str,
    url: str,
) -> int:
    source = registry.get(source_id)
    report = diagnose_url(source, url)

    print(f"Source:               {report['source_name']} ({report['source_id']})")
    print(f"Trust tier:           {report['trust_tier']}")
    print(f"Host:                 {report['host']}")
    print(
        "Domain allowed:       "
        + ("YES" if report["domain_allowed"] else "NO")
    )

    if not report["domain_allowed"]:
        print(
            "Allowed domains:      "
            + ", ".join(report["allowed_domains"])
        )
        print("Automated fetch:      BLOCKED")
        return 2

    robots = report["robots"] or {}
    print(f"robots.txt:           {robots.get('robots_url', 'n/a')}")
    print(f"Robots status:        {str(robots.get('status', 'unknown')).upper()}")
    print(f"Robots HTTP status:   {robots.get('http_status', 'n/a')}")
    print(f"Reason:               {robots.get('reason', '')}")
    print(
        "Automated fetch:      "
        + ("ALLOWED" if report["automated_fetch_allowed"] else "BLOCKED")
    )

    return 0 if report["automated_fetch_allowed"] else 3


def fetch_page(
    registry: SourceRegistry,
    storage: Storage,
    source_id: str,
    governorate: str,
    url: str,
) -> int:
    source = registry.get(source_id)
    fetcher = TrustedFetcher()
    result = fetcher.fetch(url, source)

    digest = sha256_bytes(result.body)
    evidence_id = (
        f"{slugify(source.id)}-"
        f"{timestamp_slug()}-"
        f"{digest[:10]}"
    )

    html_path = storage.save_html(
        governorate=governorate,
        source_id=source.id,
        evidence_id=evidence_id,
        html=result.body,
    )

    extraction = extract_page(result.body, result.final_url)
    extraction_path = storage.extraction_json_path(
        governorate,
        source.id,
        evidence_id,
    )
    storage.save_json(extraction_path, extraction.to_dict())

    evidence = EvidenceRecord(
        evidence_id=evidence_id,
        source_id=source.id,
        source_name=source.name,
        trust_tier=source.trust_tier,
        requested_url=result.requested_url,
        final_url=result.final_url,
        governorate=governorate,
        retrieved_at=utc_now_iso(),
        http_status=result.status_code,
        content_type=result.content_type,
        sha256=digest,
        html_path=str(html_path.relative_to(storage.base_dir.parent)),
        extraction_path=str(extraction_path.relative_to(storage.base_dir.parent)),
        robots=result.robots.to_dict(),
        notes=[
            "Evidence snapshot only.",
            "Extracted text and images require verification before publication.",
        ],
    )

    evidence_path = storage.evidence_json_path(
        governorate,
        source.id,
        evidence_id,
    )
    storage.save_json(evidence_path, evidence.to_dict())

    candidate_name = (
        extraction.headings[0]
        if extraction.headings
        else extraction.title
    )
    candidate_summary = extraction.meta_description

    draft = DraftRecord(
        draft_id=f"draft-{evidence_id}",
        governorate=governorate,
        status="needs-review",
        candidate_name=candidate_name,
        candidate_summary=candidate_summary,
        source_evidence=[evidence_id],
        image_candidates=extraction.image_candidates,
        verification={
            "status": "unverified",
            "review_required": True,
            "notes": [
                "No extracted field is considered verified in Phase 1.1.",
                "Image licenses have not been checked.",
            ],
        },
        provenance={
            "candidate_name": [evidence_id] if candidate_name else [],
            "candidate_summary": [evidence_id] if candidate_summary else [],
            "image_candidates": [evidence_id]
            if extraction.image_candidates
            else [],
        },
    )

    draft_path = storage.draft_json_path(
        governorate,
        draft.draft_id,
    )
    storage.save_json(draft_path, draft.to_dict())

    print("Saved evidence:")
    print(f"  HTML:       {html_path}")
    print(f"  Extraction: {extraction_path}")
    print(f"  Evidence:   {evidence_path}")
    print(f"  Draft:      {draft_path}")
    print()
    print("Status: needs-review")
    print("Nothing was published to the website.")
    return 0


def main() -> int:
    args = build_parser().parse_args()
    registry = SourceRegistry()
    storage = Storage()

    try:
        if args.command == "sources":
            return list_sources(registry)

        if args.command == "check":
            return check_url(
                registry=registry,
                source_id=args.source,
                url=args.url,
            )

        if args.command == "fetch":
            return fetch_page(
                registry=registry,
                storage=storage,
                source_id=args.source,
                governorate=args.governorate,
                url=args.url,
            )

        return 1

    except PipelineError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except (ValueError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
