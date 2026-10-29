from __future__ import annotations

import time
from dataclasses import dataclass
from urllib.parse import urlparse

import requests

from .errors import DomainNotAllowedError, FetchError, RobotsPolicyError
from .models import RobotsDecision, SourceSpec
from .robots import RobotsChecker
from .utils import ensure_http_url, host_matches


DEFAULT_USER_AGENT = (
    "HeritageBridgeResearchBot/0.1.1 "
    "(academic heritage research; respectful crawler; manual review required)"
)


@dataclass
class FetchResult:
    requested_url: str
    final_url: str
    status_code: int
    content_type: str
    body: bytes
    robots: RobotsDecision


class TrustedFetcher:
    def __init__(
        self,
        user_agent: str = DEFAULT_USER_AGENT,
        min_delay_seconds: float = 1.5,
        timeout_seconds: float = 25.0,
    ):
        self.user_agent = user_agent
        self.min_delay_seconds = min_delay_seconds
        self.timeout_seconds = timeout_seconds
        self._last_request_by_host: dict[str, float] = {}

        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            }
        )

        self.robots_checker = RobotsChecker(
            session=self.session,
            user_agent=self.user_agent,
            timeout_seconds=min(15.0, self.timeout_seconds),
        )

    def assert_allowed_domain(self, url: str, source: SourceSpec) -> None:
        host = urlparse(url).hostname or ""
        if not host_matches(host, source.domains):
            raise DomainNotAllowedError(
                f"URL host '{host}' is not allowed for trusted source "
                f"'{source.id}'. Allowed: {', '.join(source.domains)}"
            )

    def diagnose(self, url: str, source: SourceSpec) -> RobotsDecision:
        url = ensure_http_url(url)
        self.assert_allowed_domain(url, source)
        return self.robots_checker.check(url)

    def _throttle(self, host: str) -> None:
        previous = self._last_request_by_host.get(host)
        if previous is not None:
            elapsed = time.monotonic() - previous
            remaining = self.min_delay_seconds - elapsed
            if remaining > 0:
                time.sleep(remaining)

    def fetch(self, url: str, source: SourceSpec) -> FetchResult:
        url = ensure_http_url(url)
        self.assert_allowed_domain(url, source)

        robots = self.robots_checker.check(url)
        if not robots.may_fetch:
            raise RobotsPolicyError(
                f"robots status={robots.status}. {robots.reason} "
                f"Checked: {robots.robots_url}"
            )

        host = urlparse(url).hostname or ""
        self._throttle(host)

        try:
            response = self.session.get(
                url,
                timeout=self.timeout_seconds,
                allow_redirects=True,
            )
        except requests.Timeout as exc:
            raise FetchError(
                f"Timed out while fetching {url}"
            ) from exc
        except requests.RequestException as exc:
            raise FetchError(
                f"Network error while fetching {url}: {exc}"
            ) from exc
        finally:
            self._last_request_by_host[host] = time.monotonic()

        # A trusted page may redirect. The final destination must still be trusted.
        self.assert_allowed_domain(response.url, source)

        if response.status_code >= 400:
            raise FetchError(
                f"Target page returned HTTP {response.status_code}: {response.url}"
            )

        content_type = (
            response.headers.get("Content-Type", "")
            .split(";")[0]
            .strip()
            .lower()
        )

        if content_type not in {"text/html", "application/xhtml+xml"}:
            raise FetchError(
                "Phase 1.1 only accepts HTML pages. "
                f"Received: {content_type or 'unknown'}"
            )

        if not response.content:
            raise FetchError("Target page returned an empty response body.")

        return FetchResult(
            requested_url=url,
            final_url=response.url,
            status_code=response.status_code,
            content_type=content_type,
            body=response.content,
            robots=robots,
        )
