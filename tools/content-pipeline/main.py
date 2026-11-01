from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
import uuid
from datetime import datetime, timezone

from hb_pipeline.logging import PipelineLogger, error_details
from hb_pipeline.config import SourceRegistry
from hb_pipeline.diagnostics import diagnose_url
from hb_pipeline.errors import PipelineError
from hb_pipeline.evidence_repository import read_json
from hb_pipeline.http import RequestPolicy
from hb_pipeline.extractor import extract_page
from hb_pipeline.fetcher import TrustedFetcher
from hb_pipeline.models import DraftRecord, EvidenceRecord
from hb_pipeline.storage import Storage
from hb_pipeline.validation import validate_draft
from hb_pipeline.utils import (
    sha256_bytes,
    slugify,
    timestamp_slug,
    utc_now_iso,
    normalize_url,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="History in Cards trusted-content pipeline - Phase 1.1"
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

    fetch.add_argument("--site-id", help="Stable target site ID; requires --site-name.")
    fetch.add_argument("--site-name", help="Exact site name for image-specific matching.")
    fetch.add_argument("--site-alias", action="append", default=[], help="Explicit alternative site name; repeatable.")

    batch = sub.add_parser("batch", help="Collect a manifest of sites, recording failures and continuing.")
    batch.add_argument("manifest", type=Path, help="JSON jobs array or {jobs:[...]}.")
    batch.add_argument("--report", type=Path, help="Separate JSON outcome report; defaults to data/logs/.")
    for command in (fetch, batch):
        command.add_argument("--max-attempts", type=int, default=3, help="Total attempts per URL (1-5).")
        command.add_argument("--timeout", type=float, default=25, help="Read timeout seconds (0 < value <= 30).")
        command.add_argument("--retry-delay", type=float, default=1, help="Initial backoff seconds.")
        command.add_argument("--max-retry-delay", type=float, default=8, help="Backoff cap, at most 30 seconds.")
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
    logger=None,
) -> int:
    source = registry.get(source_id)
    report = diagnose_url(source, url)
    if logger:
        allowed = report["automated_fetch_allowed"]
        logger.log("source.check", "allowed" if allowed else "blocked", source=source.id, url=url,
            errors=[] if allowed else [{"message": (report.get("robots") or {}).get("reason", "Source domain is not allowed.")}], diagnostics=report)

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


def fetch_page(registry, storage, source_id, governorate, url, target_site=None, fetcher=None, logger=None):
    logger = logger or PipelineLogger(storage)
    context = {}
    if fetcher is not None:
        fetcher.last_evidence_id = None
    logger.log("fetch", "started", source=source_id, url=url, governorate=governorate)
    try:
        result = _fetch_page(registry, storage, source_id, governorate, url, target_site, fetcher, logger, context)
        if fetcher is not None:
            fetcher.last_evidence_id = context.get("evidence_id")
        return result
    except Exception as exc:
        logger.log("fetch", "failed", source=source_id, url=url, governorate=governorate,
                   evidence_id=context.get("evidence_id"), errors=[error_details(exc)], **{key: value for key, value in context.items() if key != "evidence_id"})
        raise


def _fetch_page(
    registry: SourceRegistry,
    storage: Storage,
    source_id: str,
    governorate: str,
    url: str,
    target_site: dict | None = None,
    fetcher=None,
    logger=None,
    context=None,
) -> int:
    if not isinstance(governorate, str) or not governorate.strip():
        raise ValueError("Governorate must not be blank.")
    source = registry.get(source_id)
    client = fetcher if fetcher is not None else TrustedFetcher()
    try:
        result = client.fetch(url, source)
    finally:
        if fetcher is None:
            client.close()
    digest = sha256_bytes(result.body)
    context["new_sha256"] = digest
    existing = storage.find_evidence(governorate, source.id, [result.requested_url, result.final_url], digest)
    same_url = bool(existing and {normalize_url(result.requested_url), normalize_url(result.final_url)} &
                    {normalize_url(existing[1]["requested_url"]), normalize_url(existing[1]["final_url"])})
    change_type = "unchanged" if existing and existing[1]["sha256"] == digest and same_url else "duplicate-content" if existing and existing[1]["sha256"] == digest else "changed" if same_url else "new"
    previous = existing[1] if same_url else None
    logger.log("source.compare", change_type, source=source.id, url=result.requested_url, governorate=governorate,
        evidence_id=existing[1]["evidence_id"] if existing else None, new_sha256=digest,
        previous_sha256=previous["sha256"] if previous else None,
        previous_evidence_id=previous["evidence_id"] if previous else None, final_url=result.final_url)
    if change_type in {"unchanged", "duplicate-content"}:
        context["evidence_id"] = existing[1]["evidence_id"]
        logger.log("fetch", change_type, source=source.id, url=result.requested_url, governorate=governorate,
            evidence_id=existing[1]["evidence_id"], sha256=digest, draft_created=False)
        print(f"Duplicate content: existing evidence {existing[1]['evidence_id']} at {existing[0]}")
        print("No additional evidence or draft was saved.")
        return 0
    # Changed but invalid content is logged above and must not become a draft.
    extraction = extract_page(result.body, result.final_url, target_site=target_site, source=source)
    evidence_id = f"{slugify(source.id)}-{timestamp_slug()}-{digest[:10]}-{uuid.uuid4().hex[:6]}"
    context["evidence_id"] = evidence_id
    for image in extraction.image_candidates:
        image["evidenceId"] = evidence_id
    candidate_name = extraction.title
    candidate_summary = extraction.meta_description if len(extraction.meta_description.strip()) >= 40 else extraction.paragraphs[0]
    draft = DraftRecord(
        draft_id=f"draft-{evidence_id}", governorate=governorate, status="needs-review",
        candidate_name=candidate_name, candidate_summary=candidate_summary,
        source_evidence=[evidence_id], image_candidates=extraction.image_candidates,
        verification={"status": "unverified", "review_required": True, "notes": [
            "Extracted fields require human verification.", "Image licenses have not been checked.",
        ]},
        provenance={
            "candidate_name": [evidence_id], "candidate_summary": [evidence_id],
            "image_candidates": [evidence_id] if extraction.image_candidates else [],
        },
    )
    validate_draft(draft, {evidence_id})
    extraction_path = storage.extraction_json_path(governorate, source.id, evidence_id)
    evidence_path = storage.evidence_json_path(governorate, source.id, evidence_id)
    draft_path = storage.draft_json_path(governorate, draft.draft_id)
    html_path = storage.raw_dir / slugify(governorate) / slugify(source.id) / f"{evidence_id}.html"
    notes = ["Evidence snapshot only.", "Extracted text and images require verification before publication."]
    if existing:
        notes.append(f"Updated content for an existing URL; previous evidence: {existing[1]['evidence_id']}")
    evidence = EvidenceRecord(
        evidence_id=evidence_id, source_id=source.id, source_name=source.name,
        trust_tier=source.trust_tier, requested_url=result.requested_url, final_url=result.final_url,
        governorate=governorate, retrieved_at=datetime.now(timezone.utc).isoformat(), http_status=result.status_code,
        content_type=result.content_type, sha256=digest,
        html_path=str(html_path.relative_to(storage.base_dir.parent)),
        extraction_path=str(extraction_path.relative_to(storage.base_dir.parent)),
        robots=result.robots.to_dict(), notes=notes, change_type=change_type,
        previous_evidence_id=previous["evidence_id"] if previous else None,
        previous_sha256=previous["sha256"] if previous else None,
    )
    storage.save_html(governorate, source.id, evidence_id, result.body)
    storage.save_json(extraction_path, extraction.to_dict())
    storage.save_json(draft_path, draft.to_dict())
    # The evidence manifest is the completion marker used by duplicate detection.
    storage.save_json(evidence_path, evidence.to_dict())
    logger.log("fetch", "saved", source=source.id, url=result.requested_url, governorate=governorate,
        evidence_id=evidence_id, sha256=digest, change_type=change_type, draft_id=draft.draft_id, draft_created=True,
        attempts=client.last_attempts if isinstance(getattr(client, "last_attempts", None), list) else [])
    print("Saved evidence:")
    print(f"  HTML:       {html_path}")
    print(f"  Extraction: {extraction_path}")
    print(f"  Evidence:   {evidence_path}")
    print(f"  Draft:      {draft_path}")
    print("Status: needs-review. Nothing was published to the website.")
    return 0


def run_batch(manifest, registry, storage, fetcher, report_path=None):
    from hb_pipeline.site_identity import GOVERNORATES, governorate_key
    payload = read_json(manifest)
    jobs = payload.get("jobs") if isinstance(payload, dict) else payload
    if not isinstance(jobs, list):
        raise ValueError("Batch manifest must be an array or {jobs:[...]}.")
    report_path = report_path or storage.logs_dir / f"batch-{timestamp_slug()}-{uuid.uuid4().hex[:6]}.json"
    project_src = Path(__file__).resolve().parent.parents[1] / "src"
    target = Path(report_path).resolve()
    if target == Path(manifest).resolve() or target.is_relative_to(storage.raw_dir.resolve()) or target.is_relative_to(project_src.resolve()):
        raise ValueError("Batch report cannot overwrite the manifest, raw evidence or frontend files.")
    logger = PipelineLogger(storage)
    logger.log("batch", "started", manifest=str(Path(manifest).resolve()), total_jobs=len(jobs))
    items = []
    for index, job in enumerate(jobs):
        item = {"index": index, "job": job, "status": "needs-review", "automatically_approved": False}
        try:
            if not isinstance(job, dict):
                raise ValueError("Each batch job must be an object.")
            for field in ("source", "governorate", "url"):
                if not isinstance(job.get(field), str) or not job[field].strip():
                    raise ValueError(f"Batch job requires non-empty text: {field}.")
            if governorate_key(job["governorate"]) not in GOVERNORATES:
                raise ValueError("Batch job governorate is not recognized.")
            target_site = None
            if job.get("siteId") is not None or job.get("name") is not None:
                if not all(isinstance(job.get(field), str) and job[field].strip() for field in ("siteId", "name")):
                    raise ValueError("Site image matching requires siteId and name together.")
                aliases = job.get("alternativeNames", [])
                if not isinstance(aliases, list) or any(not isinstance(alias, str) or not alias.strip() for alias in aliases):
                    raise ValueError("alternativeNames must be an array of non-empty strings.")
                target_site = {"id": job["siteId"], "name": job["name"], "alternativeNames": aliases}
            fetch_page(registry, storage, job["source"], job["governorate"], job["url"], target_site, fetcher=fetcher, logger=logger)
            item["outcome"] = "processed"
            item["evidence_id"] = getattr(fetcher, "last_evidence_id", None)
            item["attempts"] = list(fetcher.last_attempts)
        except Exception as exc:
            # Site isolation boundary: even an unexpected individual-record fault
            # must not hide outcomes for later jobs. Never catch interrupts.
            code = getattr(exc, "code", None)
            if not code:
                code = "invalid-content" if type(exc).__name__ == "ValidationError" else "invalid-data" if isinstance(exc, (ValueError, TypeError, KeyError)) else "pipeline-error" if isinstance(exc, PipelineError) else "unexpected-error"
            item.update(outcome="failed", error={"type": type(exc).__name__, "code": code,
                "message": str(exc), "http_status": getattr(exc, "http_status", None),
                "retryable": getattr(exc, "retryable", False), "attempts": getattr(exc, "attempts", [])})
        logger.log("batch.job", item["outcome"], source=job.get("source") if isinstance(job, dict) else None,
            url=job.get("url") if isinstance(job, dict) else None,
            governorate=job.get("governorate") if isinstance(job, dict) else None,
            evidence_id=item.get("evidence_id"), errors=[item["error"]] if "error" in item else [], index=index)
        items.append(item)
    report = {"manifest": str(Path(manifest).resolve()), "items": items,
        "summary": {"total": len(items), "processed": sum(item["outcome"] == "processed" for item in items),
                    "failed": sum(item["outcome"] == "failed" for item in items)}, "automatically_approved": 0}
    storage.save_json(Path(report_path), report)
    logger.log("batch", "completed", summary=report["summary"], report_path=str(Path(report_path).resolve()))
    print(f"Batch outcomes: {report['summary']}. Report: {Path(report_path).resolve()}")
    return 2 if report["summary"]["failed"] else 0


def main() -> int:
    args = build_parser().parse_args()
    try:
        registry = SourceRegistry()
        if args.command == "sources":
            return list_sources(registry)

        if args.command == "check":
            return check_url(
                registry=registry,
                source_id=args.source,
                url=args.url,
                logger=PipelineLogger(Storage()),
            )

        if args.command in {"fetch", "batch"}:
            if not 0 < args.timeout <= 30:
                raise ValueError("Timeout must be greater than zero and at most 30 seconds.")
            policy = RequestPolicy(max_attempts=args.max_attempts, base_delay=args.retry_delay, max_delay=args.max_retry_delay)
        if args.command == "batch":
            client = TrustedFetcher(timeout_seconds=args.timeout, policy=policy)
            try:
                return run_batch(args.manifest, registry, Storage(), client, args.report)
            finally:
                client.close()
        if args.command == "fetch":
            if bool(args.site_id) != bool(args.site_name) or (args.site_alias and not args.site_id):
                raise ValueError("Provide --site-id and --site-name together; aliases require a target site.")
            target_site = {"id": args.site_id, "name": args.site_name, "alternativeNames": args.site_alias} if args.site_id else None
            client = TrustedFetcher(timeout_seconds=args.timeout, policy=policy)
            try:
                return fetch_page(registry=registry, storage=Storage(), source_id=args.source,
                    governorate=args.governorate, url=args.url, target_site=target_site, fetcher=client)
            finally:
                client.close()

        return 1

    except PipelineError as exc:
        PipelineLogger(Storage()).log("command." + args.command, "failed", source=getattr(args, "source", None),
            url=getattr(args, "url", None), governorate=getattr(args, "governorate", None), errors=[error_details(exc)])
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except (ValueError, KeyError, OSError) as exc:
        PipelineLogger(Storage()).log("command." + args.command, "failed", source=getattr(args, "source", None),
            url=getattr(args, "url", None), governorate=getattr(args, "governorate", None), errors=[error_details(exc)])
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
