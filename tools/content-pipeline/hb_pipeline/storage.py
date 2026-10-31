from __future__ import annotations

import json
import copy
import os
import re
import tempfile
from datetime import datetime, timezone
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
        self._evidence_cache = {}

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
                # Encode once rather than issuing one Python write per JSON token.
                handle.write(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False))
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
        """Compare latest same-URL revision first; only then deduplicate other URLs."""
        from .evidence_repository import read_json
        from .site_validation import valid_access_date
        folder = self.raw_dir / slugify(governorate) / slugify(source_id)
        identities = {normalize_url(url) for url in urls}
        cache = self._evidence_cache.setdefault(str(folder), {})
        present = set()
        try:
            entries = list(os.scandir(folder))
        except FileNotFoundError:
            entries = []
        for entry in entries:
            if not entry.name.endswith(".evidence.json") or not entry.is_file():
                continue
            path = Path(entry.path)
            present.add(entry.name)
            try:
                stat = entry.stat()
                signature = (stat.st_mtime_ns, stat.st_ctime_ns, stat.st_size)
                cached = cache.get(entry.name)
                if cached and cached[0] == signature:
                    continue
                payload = read_json(path)
                if not isinstance(payload, dict) or not all(isinstance(payload.get(key), str) and payload[key] for key in ("sha256", "requested_url", "final_url", "evidence_id")):
                    raise ValueError("missing required evidence fields")
                if not re.fullmatch(r"[0-9a-f]{64}", payload["sha256"]) or not valid_access_date(payload.get("retrieved_at")):
                    raise ValueError("invalid SHA-256 digest or retrieval date")
                if payload.get("source_id") != source_id:
                    raise ValueError("source_id does not match the evidence folder")
                old_urls = {normalize_url(payload[key]) for key in ("requested_url", "final_url")}
                date = datetime.fromisoformat(payload["retrieved_at"].replace("Z", "+00:00"))
                date = date.replace(tzinfo=timezone.utc) if date.tzinfo is None else date
                cache[entry.name] = (signature, date, path, payload, old_urls)
            except (OSError, ValueError) as exc:
                cache.pop(entry.name, None)
                raise StorageError(f"Cannot check duplicates: repair existing evidence record {path}: {exc}") from exc
        for deleted in cache.keys() - present:
            del cache[deleted]
        revisions, duplicates = [], []
        for _, date, path, payload, old_urls in cache.values():
            item = (date, path.name, path, payload)
            if identities & old_urls:
                revisions.append(item)
            elif payload["sha256"] == digest:
                duplicates.append(item)
        if revisions:
            newest = max(item[0] for item in revisions)
            ties = [item for item in revisions if item[0] == newest]
            if len({item[3]["sha256"] for item in ties}) > 1:
                raise StorageError("Cannot determine latest same-URL revision: conflicting captures share a retrieval timestamp; review the evidence metadata.")
        matches = revisions or duplicates
        if not matches:
            return None
        _, _, path, payload = max(matches, key=lambda item: (item[0], item[1]))
        return path, copy.deepcopy(payload)
