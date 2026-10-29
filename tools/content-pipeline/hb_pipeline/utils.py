from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "record"


def ensure_http_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Only absolute http(s) URLs are supported.")
    return url


def normalize_host(host: str) -> str:
    return host.lower().split(":")[0].rstrip(".")


def host_matches(host: str, allowed_domains: list[str]) -> bool:
    host = normalize_host(host)
    for domain in allowed_domains:
        domain = normalize_host(domain.lstrip("."))
        if host == domain or host.endswith("." + domain):
            return True
    return False


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent
