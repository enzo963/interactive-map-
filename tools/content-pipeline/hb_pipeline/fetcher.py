from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import requests

from .errors import DomainNotAllowedError, FetchError, RobotsPolicyError
from .models import RobotsDecision, SourceSpec
from .robots import RobotsChecker
from .http import RetryClient, read_limited, temporary_status
from .utils import ensure_http_url, host_matches


DEFAULT_USER_AGENT = (
    "HistoryInCardsResearchBot/0.1.1 "
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
        policy=None,
    ):
        self.user_agent = user_agent
        self.min_delay_seconds = min_delay_seconds
        self.timeout_seconds = timeout_seconds

        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            }
        )

        self.http = RetryClient(self.session, policy=policy, min_delay=min_delay_seconds)
        self.last_attempts = []
        self.robots_checker = RobotsChecker(
            session=self.session,
            user_agent=self.user_agent,
            timeout_seconds=min(15.0, self.timeout_seconds), policy=policy,
        )

    def assert_allowed_domain(self, url: str, source: SourceSpec) -> None:
        url = ensure_http_url(url)
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

    def close(self):
        self.session.close()

    def fetch(self, url: str, source: SourceSpec) -> FetchResult:
        self.last_attempts = []
        self.http.session = self.session
        url = ensure_http_url(url)
        self.assert_allowed_domain(url, source)

        requested_url = url
        visited = set()
        for hop in range(6):
            url = ensure_http_url(url)
            self.assert_allowed_domain(url, source)
            if url in visited:
                raise FetchError(f"Redirect loop detected at {url}")
            visited.add(url)
            robots = self.robots_checker.check(url)
            if not robots.may_fetch:
                error = RobotsPolicyError(f"Cannot fetch {url}: robots status={robots.status}. {robots.reason} Checked: {robots.robots_url}")
                error.code, error.http_status = "robots-" + robots.status, robots.http_status
                error.attempts = robots.attempts
                error.retryable = bool(robots.attempts and robots.attempts[-1].get("retryable"))
                raise error
            try:
                response, body = self.http.get(url, timeout=(min(5, self.timeout_seconds), self.timeout_seconds),
                    stream=True, consume=lambda reply: read_limited(reply, 5 * 1024 * 1024), history=self.last_attempts)
            except requests.Timeout as exc:
                raise FetchError(f"Timed out while fetching {url}; retry budget exhausted.", code="timeout", retryable=True, attempts=self.last_attempts) from exc
            except requests.RequestException as exc:
                raise FetchError(f"Network error while fetching {url}: {exc}", code="network-error",
                    retryable=bool(self.last_attempts and self.last_attempts[-1].get("retryable")), attempts=self.last_attempts) from exc
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("Location", "").strip()
                response.close()
                if not location:
                    raise FetchError(f"HTTP redirect at {url} has no Location header.")
                if hop == 5:
                    raise FetchError("Too many redirects (maximum 5); inspect the source URL manually.")
                next_url = ensure_http_url(urljoin(url, location))
                self.assert_allowed_domain(next_url, source)
                url = next_url
                continue
            if not 200 <= response.status_code < 300:
                status = response.status_code
                response.close()
                raise FetchError(f"Target page returned HTTP {status}: {url}", code=f"http-{status}",
                    http_status=status, retryable=temporary_status(status), attempts=self.last_attempts)
            break

        content_type = (
            response.headers.get("Content-Type", "")
            .split(";")[0]
            .strip()
            .lower()
        )

        try:
            if content_type not in {"text/html", "application/xhtml+xml"}:
                raise FetchError(f"Expected HTML; received {content_type or 'unknown'}.", code="invalid-content-type", attempts=self.last_attempts)
            if not body:
                raise FetchError("Target page returned an empty response body.", code="empty-body", attempts=self.last_attempts)
        finally:
            response.close()
        return FetchResult(
            requested_url=requested_url,
            final_url=response.url,
            status_code=response.status_code,
            content_type=content_type,
            body=body,
            robots=robots,
        )
