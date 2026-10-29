from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .utils import project_root, slugify


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
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
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
