"""One bounded retry policy for idempotent pipeline GET requests."""
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

import requests

from .errors import FetchError


def temporary_status(status):
    return status in {408, 425, 429} or 500 <= status <= 599 and status not in {501, 505}


@dataclass(frozen=True)
class RequestPolicy:
    max_attempts: int = 3
    base_delay: float = 1
    max_delay: float = 8
    max_retry_after: float = 30

    def __post_init__(self):
        if type(self.max_attempts) is not int or not 1 <= self.max_attempts <= 5:
            raise ValueError("Request attempts must be an integer between 1 and 5.")
        if not 0 <= self.base_delay <= self.max_delay <= 30 or not 0 <= self.max_retry_after <= 30:
            raise ValueError("Retry delays must be bounded between zero and 30 seconds.")


def read_limited(response, limit):
    body = bytearray()
    for chunk in response.iter_content(chunk_size=16384):
        if chunk:
            body.extend(chunk)
            if len(body) > limit:
                raise FetchError(f"Response exceeds the {limit} byte limit.", code="response-too-large")
    return bytes(body)


class RetryClient:
    def __init__(self, session, policy=None, min_delay=0, sleeper=None):
        self.session, self.policy = session, policy or RequestPolicy()
        self.min_delay, self.sleep = min_delay, sleeper or time.sleep
        self.last_by_host = {}

    def _wait(self, headers, attempt):
        value = headers.get("Retry-After")
        delay = min(self.policy.max_delay, self.policy.base_delay * 2 ** (attempt - 1))
        if value is not None:
            try:
                retry_after = float(value)
                if retry_after < 0 or not retry_after < float("inf"):
                    raise ValueError("Invalid Retry-After")
            except (ValueError, TypeError):
                try:
                    date = parsedate_to_datetime(str(value))
                    if date.tzinfo is None:
                        date = date.replace(tzinfo=timezone.utc)
                    retry_after = max(0, (date - datetime.now(timezone.utc)).total_seconds())
                except (ValueError, TypeError, OverflowError):
                    retry_after = 0
            if retry_after > self.policy.max_retry_after:
                return None
            delay = max(delay, retry_after)
        return delay

    def get(self, url, *, timeout, stream=False, consume=None, history=None):
        history = history if history is not None else []
        for attempt in range(1, self.policy.max_attempts + 1):
            response = None
            event = {"url": url, "attempt": attempt}
            try:
                host = urlparse(url).netloc
                elapsed = time.monotonic() - self.last_by_host.get(host, 0)
                if self.min_delay > elapsed:
                    self.sleep(self.min_delay - elapsed)
                try:
                    response = self.session.get(url, timeout=timeout, stream=stream, allow_redirects=False)
                finally:
                    self.last_by_host[host] = time.monotonic()
                event["http_status"] = response.status_code
                retryable = temporary_status(response.status_code)
                event["retryable"] = retryable
                delay = self._wait(response.headers, attempt) if retryable else None
                if retryable and attempt < self.policy.max_attempts and delay is not None:
                    event["retry_delay"] = delay
                    history.append(event)
                    response.close()
                    self.sleep(delay)
                    continue
                if retryable and delay is None:
                    event["retry_deferred"] = "Retry-After exceeds the automatic wait budget."
                payload = consume(response) if consume and 200 <= response.status_code < 300 else None
                history.append(event)
                return response, payload
            except requests.RequestException as exc:
                if response is not None:
                    response.close()
                retryable = isinstance(exc, (requests.Timeout, requests.ConnectionError, requests.exceptions.ChunkedEncodingError)) and not isinstance(exc, requests.exceptions.SSLError)
                event.update(error_type=type(exc).__name__, message=str(exc), retryable=retryable)
                if retryable and attempt < self.policy.max_attempts:
                    delay = min(self.policy.max_delay, self.policy.base_delay * 2 ** (attempt - 1))
                    event["retry_delay"] = delay
                    history.append(event)
                    self.sleep(delay)
                    continue
                history.append(event)
                exc.pipeline_attempts = list(history)
                raise
            except Exception as exc:
                if response is not None:
                    response.close()
                history.append(event)
                if isinstance(exc, FetchError):
                    exc.attempts = list(history)
                raise


