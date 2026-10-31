"""Explicit human decisions bound to exact records and captured source versions."""
import copy
import hashlib
import json
import re
import uuid
import os
from contextlib import contextmanager
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from .evidence_repository import read_json
from .errors import StorageError
from .logging import PipelineLogger, error_details
from .site_validation import validate_site_record, valid_access_date
from .utils import normalize_url, utc_now_iso


@contextmanager
def decision_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = path.with_name(path.name + ".lock")
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise StorageError(f"Another review decision holds {lock}; retry after it finishes. Inspect a stale lock after an interrupted process.") from exc
    try:
        os.write(fd, str(os.getpid()).encode("ascii"))
        yield
    finally:
        os.close(fd)
        lock.unlink()


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()


def records_from(path):
    value = read_json(path)
    while isinstance(value, dict) and "records" in value:
        value = value["records"]
    if isinstance(value, dict) and isinstance(value.get("sites"), list):
        value = value["sites"]
    return value if isinstance(value, list) else [value]


def record_id(record):
    if not isinstance(record, dict):
        return None
    value = record.get("id") or record.get("draft_id")
    return value if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", value) else None


def unique_record(records, selected_id):
    matches = [record for record in records if record_id(record) == selected_id]
    if len(matches) != 1:
        raise ValueError("Record ID must select exactly one input record; duplicate IDs require manual selection.")
    return matches[0]


def _date(value):
    if not valid_access_date(value):
        raise ValueError("Related source evidence has an invalid retrieval date.")
    date = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return date.replace(tzinfo=timezone.utc) if date.tzinfo is None else date


def source_state(record, repository):
    state = []
    for citation in record.get("sources", []):
        ref = citation.get("evidenceId")
        if not isinstance(ref, str) or not ref:
            raise ValueError("Approval/export requires a real saved evidenceId for every source.")
        evidence, source, _, _, _ = repository.snapshot(ref)
        url = normalize_url(citation.get("url"))
        aliases = {normalize_url(evidence["final_url"])}
        if evidence.get("requested_url"):
            aliases.add(normalize_url(evidence["requested_url"]))
        if url not in aliases:
            raise ValueError("Source citation URL does not match its saved evidence.")
        revisions = []
        for other_ref, other in repository.related(source.id, aliases):
            revisions.append((_date(other.get("retrieved_at")), other_ref))
        latest_date = max(date for date, _ in revisions)
        latest = []
        for date, latest_ref in revisions:
            if date == latest_date:
                snapshot, _, _, _, _ = repository.snapshot(latest_ref)
                entry = {"evidenceId": latest_ref, "sha256": snapshot["sha256"]}
                if entry not in latest:
                    latest.append(entry)
        state.append({"evidenceId": ref, "sha256": evidence["sha256"], "sourceId": source.id,
                      "url": url, "trust_tier": source.trust_tier, "latest": sorted(latest, key=lambda item: item["evidenceId"])})
    return sorted(state, key=lambda item: (item["evidenceId"], item["url"]))


def record_context(record, repository):
    context = {"governorate": record.get("governorate") if isinstance(record, dict) else None}
    sources = record.get("sources", []) if isinstance(record, dict) else []
    source = next((item for item in sources if isinstance(item, dict)), {}) if isinstance(sources, list) else {}
    ref = source.get("evidenceId")
    matches = repository.index.get(ref, []) if isinstance(ref, str) else []
    context.update(source=matches[0][1].get("source_id") if len(matches) == 1 else source.get("sourceName"),
                   url=source.get("url"), evidence_id=ref)
    return context


class ReviewWorkflow:
    def __init__(self, storage, repository, ledger_path=None):
        self.storage, self.repository = storage, repository
        self.path = Path(ledger_path) if ledger_path else storage.base_dir / "review/decisions.json"
        self.logger = PipelineLogger(storage)

    def load(self):
        if not self.path.exists():
            return {"version": 1, "decisions": {}, "history": []}
        ledger = read_json(self.path)
        if not isinstance(ledger, dict) or ledger.get("version") != 1 or not isinstance(ledger.get("decisions"), dict) or not isinstance(ledger.get("history"), list):
            raise ValueError("Review ledger is malformed; repair it before changing decisions or exporting.")
        return ledger

    def validation(self, record):
        return validate_site_record(record, set(self.repository.index))

    def effective_status(self, record, ledger=None):
        ledger = ledger if ledger is not None else self.load()
        decision = ledger["decisions"].get(record_id(record))
        if not isinstance(decision, dict):
            return "needs-review", "No explicit review decision."
        if not isinstance(decision.get("status"), str) or decision["status"] not in {"approved", "rejected"} or not all(isinstance(decision.get(key), str) and decision[key].strip() for key in ("reviewer", "note", "decision_id")) or not valid_access_date(decision.get("reviewed_at")):
            return "needs-review", "Decision metadata is incomplete."
        if decision.get("record_hash") != fingerprint(record):
            return "needs-review", "Record changed after the decision."
        if decision["status"] == "approved":
            try:
                if not self.validation(record)["is_valid"]:
                    return "needs-review", "Approved record no longer passes validation."
                if decision.get("source_state_hash") != fingerprint(source_state(record, self.repository)):
                    return "needs-review", "Captured source versions or trust policy changed after approval."
            except Exception as exc:
                # This status view fails closed, including damaged evidence.
                return "needs-review", f"Evidence requires review: {exc}"
        return decision["status"], "Explicit human decision matches this revision."

    def list_records(self, records, status="needs-review"):
        ledger = self.load()
        counts = Counter(record_id(record) for record in records if record_id(record))
        rows = []
        for index, record in enumerate(records):
            current, reason = self.effective_status(record, ledger)
            rid = record_id(record)
            if rid and counts[rid] > 1:
                current, reason = "needs-review", "Duplicate record ID in the selected inputs."
            if status != "all" and current != status:
                continue
            rows.append({"index": index, "id": rid, "name": record.get("name", record.get("candidate_name")) if isinstance(record, dict) else None,
                         "status": current, "reason": reason, "validation": self.validation(record),
                         "review_findings": {key: copy.deepcopy(record[key]) for key in ("reliability_review", "possible_duplicates", "review_flags") if isinstance(record, dict) and key in record}})
        return rows

    def decide(self, record, status, reviewer, note, input_path):
        rid = record_id(record)
        context = record_context(record, self.repository)
        try:
            if status not in {"approved", "rejected"} or not rid:
                raise ValueError("A stable record ID and approved/rejected status are required.")
            if not isinstance(reviewer, str) or not reviewer.strip() or not isinstance(note, str) or not note.strip():
                raise ValueError("A named reviewer and a non-empty review note are required.")
            target = self.path.resolve()
            project_src = Path(__file__).resolve().parents[3] / "src"
            if target == Path(input_path).resolve() or target.is_relative_to(self.storage.raw_dir.resolve()) or target.is_relative_to(project_src.resolve()):
                raise ValueError("The review ledger must preserve input, raw and frontend files.")
            validation = self.validation(record)
            if status == "approved" and not validation["is_valid"]:
                raise ValueError("Cannot approve an invalid/non-standardized heritage record: " + "; ".join(issue["field"] + ": " + issue["message"] for issue in validation["issues"] if issue["severity"] == "error"))
            state = source_state(record, self.repository) if status == "approved" else None
            with decision_lock(self.path):
                ledger = self.load()
                decision = {"decision_id": uuid.uuid4().hex, "record_id": rid, "status": status,
                    "reviewer": reviewer.strip(), "reviewed_at": utc_now_iso(), "note": note.strip(),
                    "record_hash": fingerprint(record), "source_state_hash": fingerprint(state) if state is not None else None,
                    "source_state": state, "input_path": str(Path(input_path).resolve()),
                    "validation": validation, "record_snapshot": copy.deepcopy(record),
                    "previous_decision_id": (ledger["decisions"].get(rid) or {}).get("decision_id") if isinstance(ledger["decisions"].get(rid), dict) else None, "published": False}
                self.logger.log("review.decision", "requested", **context, record_id=rid, requested_status=status, reviewer=reviewer.strip())
                ledger["decisions"][rid] = decision
                ledger["history"].append(copy.deepcopy(decision))
                self.storage.save_json(self.path, ledger)
            self.logger.log("review.decision", status, **context, record_id=rid, decision_id=decision["decision_id"], published=False)
            return decision
        except Exception as exc:
            self.logger.log("review.decision", "failed", **context, record_id=rid, errors=[error_details(exc)])
            raise
