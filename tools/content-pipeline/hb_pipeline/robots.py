from __future__ import annotations

from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

from .models import RobotsDecision


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
        parsed = urlparse(target_url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

        try:
            response = self.session.get(
                robots_url,
                timeout=self.timeout_seconds,
                allow_redirects=True,
            )
        except requests.RequestException as exc:
            return RobotsDecision(
                status="error",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                reason=f"Network error while reading robots.txt: {exc}",
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

        if not body.strip():
            return RobotsDecision(
                status="unavailable",
                robots_url=robots_url,
                target_url=target_url,
                user_agent=self.user_agent,
                http_status=response.status_code,
                reason="robots.txt response was empty.",
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
