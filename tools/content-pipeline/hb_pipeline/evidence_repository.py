"""Resolve approved source citations to unchanged, hash-checked local snapshots."""
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from .config import SourceRegistry
from .site_validation import valid_access_date
from .utils import ensure_http_url, host_matches, sha256_bytes


def _object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key!r}")
        result[key] = value
    return result


def _constant(value):
    raise ValueError(f"Invalid JSON number: {value}")


def read_json(path):
    value = json.loads(Path(path).read_text(encoding="utf-8-sig"), object_pairs_hook=_object, parse_constant=_constant)
    json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")
    return value


def _text(value):
    return " ".join(value.split())


def _source_content(node):
    # Metadata and image attributes are part of captured evidence, too.
    parts = [node.get_text(" ", strip=True)]
    for tag in [node, *node.find_all(True)]:
        for key in ("content", "href", "src", "alt", "title", "lang"):
            value = tag.get(key)
            if isinstance(value, str):
                parts.append(value)
    return _text(" ".join(parts))


class EvidenceRepository:
    def __init__(self, data_dir, registry=None):
        self.data_dir = Path(data_dir).resolve()
        self.raw_dir = self.data_dir / "raw"
        self.registry = registry or SourceRegistry()
        self.index = {}
        self.issues = []
        for path in sorted(self.raw_dir.rglob("*.evidence.json")):
            try:
                record = read_json(path)
                ref = record.get("evidence_id") if isinstance(record, dict) else None
                if not isinstance(ref, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", ref):
                    raise ValueError("Missing or unsafe evidence_id.")
                self.index.setdefault(ref, []).append((path, record))
            except (OSError, ValueError, RecursionError) as exc:
                self.issues.append({"path": str(path), "message": str(exc)})

    def _path(self, value):
        if not isinstance(value, str) or not value:
            raise ValueError("Artifact path must be a non-empty string.")
        path = (self.data_dir.parent / value).resolve()
        if not path.is_relative_to(self.raw_dir.resolve()):
            raise ValueError("Evidence artifacts must remain inside data/raw.")
        return path

    def resolve(self, evidence_id, locator):
        matches = self.index.get(evidence_id, [])
        if len(matches) != 1:
            raise ValueError("Evidence ID is missing or ambiguous; a unique saved manifest is required.")
        _, evidence = matches[0]
        source = self.registry.get(evidence.get("source_id"))
        url = ensure_http_url(evidence.get("final_url"))
        if not host_matches(urlparse(url).hostname or "", source.domains):
            raise ValueError("Evidence URL is outside its registered source domains.")
        if type(evidence.get("http_status")) is not int or not 200 <= evidence["http_status"] < 300 or not isinstance(evidence.get("robots"), dict) or evidence["robots"].get("status") != "allowed":
            raise ValueError("Evidence must record a successful fetch and an allowed robots decision.")
        if not valid_access_date(evidence.get("retrieved_at")):
            raise ValueError("Evidence retrieval date is malformed.")
        html_path = self._path(evidence.get("html_path"))
        if html_path.name != f"{evidence_id}.html":
            raise ValueError("Snapshot filename does not match its evidence ID.")
        raw = html_path.read_bytes()
        if sha256_bytes(raw) != evidence.get("sha256"):
            raise ValueError("Raw snapshot hash does not match the evidence manifest.")
        if not isinstance(locator, dict) or not isinstance(locator.get("text_match"), str) or not locator["text_match"].strip():
            raise ValueError("A locator with non-empty text_match is required for every assertion.")
        path = self._path(locator.get("artifact"))
        if not path.name.startswith(evidence_id + "."):
            raise ValueError("Locator artifact belongs to a different evidence ID.")
        match = _text(locator["text_match"])
        soup = BeautifulSoup(raw, "html.parser")
        if match not in _source_content(soup):
            raise ValueError("Locator text is not present in the captured raw source.")
        if path.suffix == ".html":
            if path != html_path or not isinstance(locator.get("selector"), str):
                raise ValueError("Raw HTML locators need a selector on the matching snapshot.")
            try:
                nodes = soup.select(locator["selector"])
            except Exception as exc:
                raise ValueError("Invalid HTML locator selector.") from exc
            if not any(match in _source_content(node) for node in nodes):
                raise ValueError("Locator text does not occur in the selected HTML content.")
        elif path.name.endswith("extracted.json"):
            pointer = locator.get("json_pointer")
            if not isinstance(pointer, str) or not pointer.startswith("/"):
                raise ValueError("Extracted JSON locators need an absolute JSON pointer.")
            value = read_json(path)
            for token in pointer[1:].split("/"):
                if re.search(r"~(?![01])", token):
                    raise ValueError("Invalid JSON pointer escape.")
                token = token.replace("~1", "/").replace("~0", "~")
                if isinstance(value, list):
                    if not re.fullmatch(r"0|[1-9][0-9]*", token):
                        raise ValueError("JSON pointer array index is invalid.")
                    value = value[int(token)]
                elif isinstance(value, dict):
                    value = value[token]
                else:
                    raise ValueError("JSON pointer does not resolve to content.")
            content = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
            if match not in _text(content):
                raise ValueError("Locator text is missing from the selected extraction value.")
        else:
            raise ValueError("Locator must reference raw HTML or an extracted JSON artifact.")
        citation = {"sourceId": source.id, "sourceName": source.name, "url": url,
                    "evidenceId": evidence_id, "accessedAt": evidence["retrieved_at"],
                    "trust_tier": source.trust_tier, "recorded_trust_tier": evidence.get("trust_tier")}
        return citation, source
