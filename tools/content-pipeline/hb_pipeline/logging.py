"""Atomic structured pipeline events, kept separately from research artifacts."""
import uuid
from datetime import datetime, timezone


class PipelineLogger:
    def __init__(self, storage=None, run_id=None):
        if storage is None:
            from .storage import Storage
            storage = Storage()
        self.storage, self.run_id = storage, run_id or uuid.uuid4().hex

    def log(self, operation, result, *, source=None, url=None, governorate=None, evidence_id=None, errors=None, **details):
        now = datetime.now(timezone.utc)
        event_id = uuid.uuid4().hex
        event = {"timestamp": now.isoformat(), "event_id": event_id, "run_id": self.run_id,
                 "operation": operation, "result": result, "source": source, "url": url,
                 "governorate": governorate, "evidence_id": evidence_id, "errors": errors or [], "details": details}
        path = self.storage.logs_dir / "pipeline" / now.strftime("%Y-%m-%d") / (now.strftime("%H%M%S%f") + "-" + event_id + ".json")
        self.storage.save_json(path, event)
        return event


def error_details(exc):
    return {"type": type(exc).__name__, "code": getattr(exc, "code", None), "message": str(exc),
            "http_status": getattr(exc, "http_status", None), "retryable": getattr(exc, "retryable", False),
            "attempts": getattr(exc, "attempts", [])}
