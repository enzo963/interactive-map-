from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from .utils import normalize_url, project_root, slugify
from .errors import StorageError


class Storage:
    def __init__(self, base_dir: Path | None = None):
        self.base_dir = base_dir or project_root() / "data"
        self.raw_dir = self.base_dir / "raw"
        self.drafts_dir = self.base_dir / "drafts"
        self.logs_dir = self.base_dir / "logs"

        for path in (self.raw_dir, self.drafts_dir, self.logs_dir):
            path.mkdir(parents=True, exist_ok=True)

    def save_html(
        self,
        governorate: str,
        source_id: str,
        evidence_id: str,
        html: bytes,
    ) -> Path:
        folder = self.raw_dir / slugify(governorate) / slugify(source_id)
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{evidence_id}.html"
        path.write_bytes(html)
        return path

    def save_json(self, path: Path, payload: dict[str, Any] | list[Any]) -> Path:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as handle:
                temp_path = Path(handle.name)
                json.dump(payload, handle, ensure_ascii=False, indent=2, allow_nan=False)
                handle.flush()
                os.fsync(handle.fileno())
            temp_path.replace(path)
        except (OSError, ValueError, TypeError) as exc:
            raise StorageError(f"Cannot save JSON record {path}: {exc}") from exc
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink()
        return path


    def evidence_json_path(
        self, governorate: str, source_id: str, evidence_id: str
    ) -> Path:
        return (
            self.raw_dir
            / slugify(governorate)
            / slugify(source_id)
            / f"{evidence_id}.evidence.json"
        )

    def extraction_json_path(
        self, governorate: str, source_id: str, evidence_id: str
    ) -> Path:
        return (
            self.raw_dir
            / slugify(governorate)
            / slugify(source_id)
            / f"{evidence_id}.extracted.json"
        )

    def draft_json_path(self, governorate: str, draft_id: str) -> Path:
        return self.drafts_dir / slugify(governorate) / f"{draft_id}.json"


    def find_evidence(self, governorate: str, source_id: str, urls: list[str], digest: str) -> tuple[Path, dict] | None:
        """Prefer content duplicates, then previous URL revisions in the same scope."""
        folder = self.raw_dir / slugify(governorate) / slugify(source_id)
        identities = {normalize_url(url) for url in urls}
        revision = None
        for path in sorted(folder.glob("*.evidence.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                if not isinstance(payload, dict) or not all(isinstance(payload.get(key), str) and payload[key] for key in ("sha256", "requested_url", "final_url", "evidence_id")):
                    raise ValueError("missing required evidence fields")
                if not re.fullmatch(r"[0-9a-f]{64}", payload["sha256"]):
                    raise ValueError("invalid SHA-256 digest")
                old_urls = {normalize_url(payload[key]) for key in ("requested_url", "final_url")}
            except (OSError, ValueError) as exc:
                raise StorageError(f"Cannot check duplicates: repair existing evidence record {path}: {exc}") from exc
            if payload["sha256"] == digest:
                return path, payload
            if identities & old_urls:
                revision = path, payload
        return revision
