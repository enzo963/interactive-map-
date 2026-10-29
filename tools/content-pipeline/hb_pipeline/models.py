from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal


RobotsStatus = Literal["allowed", "denied", "unavailable", "error"]


@dataclass(frozen=True)
class SourceSpec:
    id: str
    name: str
    trust_tier: int
    domains: list[str]
    allowed_content: list[str] = field(default_factory=list)
    notes: str = ""


@dataclass(frozen=True)
class RobotsDecision:
    status: RobotsStatus
    robots_url: str
    target_url: str
    user_agent: str
    http_status: int | None = None
    reason: str = ""

    @property
    def may_fetch(self) -> bool:
        return self.status == "allowed"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PageExtraction:
    title: str = ""
    canonical_url: str = ""
    meta_description: str = ""
    language: str = ""
    headings: list[str] = field(default_factory=list)
    paragraphs: list[str] = field(default_factory=list)
    image_candidates: list[dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EvidenceRecord:
    evidence_id: str
    source_id: str
    source_name: str
    trust_tier: int
    requested_url: str
    final_url: str
    governorate: str
    retrieved_at: str
    http_status: int
    content_type: str
    sha256: str
    html_path: str
    extraction_path: str
    robots: dict[str, Any]
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DraftRecord:
    draft_id: str
    governorate: str
    status: str
    candidate_name: str
    candidate_summary: str
    source_evidence: list[str]
    image_candidates: list[dict[str, str]]
    verification: dict[str, Any]
    provenance: dict[str, list[str]]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
