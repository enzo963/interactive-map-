from __future__ import annotations

from urllib.parse import urlparse

from .fetcher import TrustedFetcher
from .models import SourceSpec
from .utils import ensure_http_url, host_matches


def diagnose_url(
    source: SourceSpec,
    url: str,
    fetcher: TrustedFetcher | None = None,
) -> dict:
    url = ensure_http_url(url)
    fetcher = fetcher or TrustedFetcher()
    host = urlparse(url).hostname or ""
    domain_allowed = host_matches(host, source.domains)

    result = {
        "source_id": source.id,
        "source_name": source.name,
        "trust_tier": source.trust_tier,
        "url": url,
        "host": host,
        "allowed_domains": source.domains,
        "domain_allowed": domain_allowed,
        "robots": None,
        "automated_fetch_allowed": False,
    }

    if not domain_allowed:
        return result

    robots = fetcher.diagnose(url, source)
    result["robots"] = robots.to_dict()
    result["automated_fetch_allowed"] = robots.may_fetch
    return result
