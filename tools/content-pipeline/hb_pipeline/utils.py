from __future__ import annotations

import hashlib
import ipaddress
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urlunparse


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
    """Validate before parsing or sending a URL; never accept embedded credentials."""
    if not isinstance(url, str) or not url.strip():
        raise ValueError("URL must be a non-empty absolute HTTP(S) address.")
    if re.search(r"[\x00-\x1f\x7f]", url):
        raise ValueError("URL cannot contain control characters.")
    url = url.strip()
    if re.search(r"\s", url) or "\\" in url:
        raise ValueError("URL cannot contain spaces or backslashes; encode path spaces as %20.")
    if re.search(r"%(?![0-9a-fA-F]{2})", url) or re.search(r"%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)", url, re.I):
        raise ValueError("URL contains malformed escapes or encoded control characters/backslashes.")
    try:
        parsed = urlparse(url)
        host = parsed.hostname
        port = parsed.port
    except ValueError as exc:
        raise ValueError(f"URL has an invalid host or port: {exc}") from exc
    if parsed.scheme.lower() not in {"http", "https"} or not host:
        raise ValueError("Only absolute HTTP(S) URLs with a hostname are supported.")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("URL credentials are not allowed. Use the public source URL.")
    if port == 0:
        raise ValueError("URL port must be between 1 and 65535.")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        try:
            host = host.rstrip(".").encode("idna").decode("ascii").lower()
        except UnicodeError as exc:
            raise ValueError("URL hostname cannot be converted to a valid domain.") from exc
        labels = host.split(".")
        if len(host) > 253 or len(labels) < 2 or all(label.isdigit() for label in labels) or any(
            not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in labels
        ):
            raise ValueError("URL must contain a valid public domain name.")
        if host.endswith((".localhost", ".local", ".internal")):
            raise ValueError("Local/internal URL hosts are not supported.")
    else:
        if not address.is_global:
            raise ValueError("Private, loopback, and reserved IP addresses are not supported.")
    return url


def normalize_host(host: str) -> str:
    host = host.strip().lower().rstrip(".")
    # Source allowlists contain hostnames, never URL credentials or paths.
    return host.encode("idna").decode("ascii")


def normalize_url(url: str) -> str:
    """Identity for duplicate checks: ignore fragments and default ports only."""
    parsed = urlparse(ensure_http_url(url))
    host = normalize_host(parsed.hostname or "")
    if ":" in host:
        host = f"[{host}]"
    port = parsed.port
    if port is not None and (parsed.scheme.lower(), port) not in {("http", 80), ("https", 443)}:
        host += f":{port}"
    return urlunparse((parsed.scheme.lower(), host, parsed.path or "/", parsed.params, parsed.query, ""))


def host_matches(host: str, allowed_domains: list[str]) -> bool:
    host = normalize_host(host)
    for domain in allowed_domains:
        domain = normalize_host(domain.lstrip("."))
        if host == domain or host.endswith("." + domain):
            return True
    return False


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent
