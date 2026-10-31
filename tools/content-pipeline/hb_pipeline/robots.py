from __future__ import annotations

import re
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

from .models import RobotsDecision
from .utils import ensure_http_url


class RobotsChecker:
    def __init__(
        self,
        session: requests.Session,
        user_agent: str,
        timeout_seconds: float = 15.0,
    ):
        self.session = session
        self.user_agent = user_agent
        self.timeout_seconds = timeout_seconds

    def check(self, target_url: str) -> RobotsDecision:
        target_url = ensure_http_url(target_url)
        parsed = urlparse(target_url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

        try:
            response = self.session.get(
                robots_url,
                timeout=self.timeout_seconds,
                allow_redirects=False,
            )
        except requests.RequestException as exc:
            return RobotsDecision(
                status="error",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                reason=f"Network error while reading robots.txt: {exc}",
            )

        if 300 <= response.status_code < 400:
            response.close()
            return RobotsDecision(
                status="error", robots_url=robots_url, target_url=target_url,
                user_agent=self.user_agent, http_status=response.status_code,
                reason="robots.txt redirected; policy cannot be verified at this origin. Use an official API or inspect the source manually.",
            )

        if response.status_code in {404, 410}:
            return RobotsDecision(
                status="unavailable",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                http_status=response.status_code,
                reason="robots.txt was not found. Phase 1.1 uses a conservative stop policy.",
            )

        if response.status_code >= 400:
            return RobotsDecision(
                status="error",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                http_status=response.status_code,
                reason=f"robots.txt returned HTTP {response.status_code}.",
            )

        content_type = response.headers.get("Content-Type", "").lower()
        body = response.text

        if "html" in content_type or body.lstrip().lower().startswith(("<!doctype html", "<html")):
            return RobotsDecision(
                status="error", robots_url=robots_url, target_url=target_url,
                user_agent=self.user_agent, http_status=response.status_code,
                reason="robots.txt returned HTML rather than a verifiable robots policy.",
            )

        if not body.strip():
            return RobotsDecision(
                status="unavailable",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                http_status=response.status_code,
                reason="robots.txt response was empty.",
            )

        if not re.search(r"^\s*user-agent\s*:", body, re.I | re.M):
            return RobotsDecision(
                status="error", robots_url=robots_url, target_url=target_url,
                user_agent=self.user_agent, http_status=response.status_code,
                reason="robots.txt contains no User-agent directive; policy cannot be verified.",
            )

        parser = RobotFileParser()
        parser.set_url(robots_url)

        try:
            parser.parse(body.splitlines())
            allowed = parser.can_fetch(self.user_agent, target_url)
        except Exception as exc:
            return RobotsDecision(
                status="error",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                http_status=response.status_code,
                reason=f"robots.txt could not be parsed: {exc}",
            )

        if allowed:
            return RobotsDecision(
                status="allowed",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                http_status=response.status_code,
                reason="robots.txt allows this user agent to fetch the target URL.",
            )

        return RobotsDecision(
            status="denied",
            robots_url=robots_url,
            target_url=target_url,
            user_agent=self.user_agent,
            http_status=response.status_code,
            reason="robots.txt does not allow this user agent to fetch the target URL.",
        )
