from __future__ import annotations

import json
from pathlib import Path

from .errors import SourceConfigurationError
from .models import SourceSpec
from .utils import project_root


class SourceRegistry:
    def __init__(self, path: Path | None = None):
        self.path = path or project_root() / "config" / "sources.json"
        self._sources = self._load()

    def _load(self) -> dict[str, SourceSpec]:
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise SourceConfigurationError(
                f"Source registry not found: {self.path}"
            ) from exc
        except json.JSONDecodeError as exc:
            raise SourceConfigurationError(
                f"Source registry is invalid JSON: {exc}"
            ) from exc

        if not isinstance(payload, dict):
            raise SourceConfigurationError("Source registry root must be a JSON object.")
        raw_sources = payload.get("sources")
        if not isinstance(raw_sources, list):
            raise SourceConfigurationError("'sources' must be a list.")

        result: dict[str, SourceSpec] = {}

        for raw in raw_sources:
            if not isinstance(raw, dict) or not isinstance(raw.get("domains"), list) or any(not isinstance(domain, str) for domain in raw["domains"]):
                raise SourceConfigurationError("Each source must be an object with a list of domain strings.")
            try:
                source = SourceSpec(
                    id=str(raw["id"]).strip(),
                    name=str(raw["name"]).strip(),
                    trust_tier=int(raw["trust_tier"]),
                    domains=[str(d).strip().lower() for d in raw.get("domains", []) if str(d).strip()],
                    allowed_content=[str(x).strip() for x in raw.get("allowed_content", [])],
                    notes=str(raw.get("notes", "")).strip(),
                )
            except (KeyError, TypeError, ValueError) as exc:
                raise SourceConfigurationError(
                    f"Invalid source entry: {raw!r}"
                ) from exc

            if not source.id:
                raise SourceConfigurationError("Source id cannot be empty.")
            if source.id in result:
                raise SourceConfigurationError(f"Duplicate source id: {source.id}")
            if source.trust_tier < 1:
                raise SourceConfigurationError(
                    f"Source {source.id} has invalid trust tier."
                )
            if not source.domains:
                raise SourceConfigurationError(
                    f"Source {source.id} has no allowed domains."
                )

            result[source.id] = source

        return result

    def get(self, source_id: str) -> SourceSpec:
        try:
            return self._sources[source_id]
        except KeyError as exc:
            raise SourceConfigurationError(
                f"Unknown trusted source: {source_id}"
            ) from exc

    def all(self) -> list[SourceSpec]:
        return sorted(
            self._sources.values(),
            key=lambda item: (item.trust_tier, item.name),
        )
