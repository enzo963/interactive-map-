"""Bounded, policy-aware image GET checks. Failures are data, never approvals."""
import copy
import hashlib
import io
import warnings
from urllib.parse import urljoin, urlparse

import requests
from PIL import Image, UnidentifiedImageError

from .config import SourceRegistry
from .errors import PipelineError
from .http import RetryClient, read_limited
from .fetcher import DEFAULT_USER_AGENT
from .robots import RobotsChecker
from .utils import normalize_url, host_matches, utc_now_iso

MIME_FORMATS = {"image/jpeg": "JPEG", "image/jpg": "JPEG", "image/png": "PNG", "image/x-png": "PNG",
                "image/webp": "WEBP", "image/gif": "GIF", "image/avif": "AVIF"}


class ImageURLValidator:
    def __init__(self, registry=None, session=None, robots_checker=None, timeout=(5, 10),
                 max_bytes=8 * 1024 * 1024, max_pixels=40_000_000, max_frames=50, min_delay=1.5, policy=None, logger=None):
        self.registry = registry or SourceRegistry()
        self.logger = logger
        self.session = session or requests.Session()
        self._owns_session = session is None
        self.session.headers.update({"User-Agent": DEFAULT_USER_AGENT, "Accept": "image/avif,image/webp,image/png,image/jpeg,image/gif"})
        self.robots = robots_checker or RobotsChecker(self.session, DEFAULT_USER_AGENT, timeout_seconds=10, policy=policy)
        self.http = RetryClient(self.session, policy=policy, min_delay=min_delay)
        self.timeout = timeout
        self.max_bytes, self.max_pixels, self.max_frames = max_bytes, max_pixels, max_frames
        self.cache = {}
        self.allowed_domains = [domain for source in self.registry.all() for domain in source.domains]

    def close(self):
        if self._owns_session:
            self.session.close()

    def _allowed(self, url):
        url = normalize_url(url)
        if not host_matches(urlparse(url).hostname or "", self.allowed_domains):
            raise ValueError("Image host is outside the existing trusted-source domain registry.")
        return url

    def validate(self, value, *, source=None, governorate=None, evidence_id=None):
        report = self._validate(value)
        if self.logger:
            self.logger.log("image.validate", "valid" if report["valid"] else "failed", source=source,
                url=value if isinstance(value, str) else None, governorate=governorate, evidence_id=evidence_id,
                errors=[] if report["valid"] else [{"code": report["status"], "message": report["reason"]}],
                checkedAt=report["checkedAt"], final_url=report["final_url"], attempts=report.get("attempts", []))
        return report

    def _validate(self, value):
        report = {"requested_url": value, "final_url": None, "valid": False, "status": "invalid-url",
                  "checkedAt": utc_now_iso(), "http_status": None, "content_type": None,
                  "redirects": [], "robots": [], "attempts": [], "reason": "", "bytes_read": 0}
        try:
            key = normalize_url(value)
        except (ValueError, TypeError) as exc:
            report["reason"] = str(exc)
            return report
        if key in self.cache:
            return copy.deepcopy(self.cache[key])
        response = None
        try:
            url, visited = key, set()
            for hop in range(6):
                report["final_url"] = url
                report["status"] = "policy-blocked"
                url = self._allowed(url)
                if url in visited:
                    report.update(status="redirect-error", reason="Redirect loop.")
                    break
                visited.add(url)
                policy = self.robots.check(url)
                report["robots"].append(policy.to_dict())
                if not policy.may_fetch:
                    report["reason"] = "Robots policy did not permit this image request: " + policy.status
                    break
                report["status"] = "network-error"
                response, body = self.http.get(url, stream=True, timeout=self.timeout,
                    consume=lambda reply: read_limited(reply, self.max_bytes), history=report["attempts"])
                report["http_status"] = response.status_code
                if response.status_code in {301, 302, 303, 307, 308}:
                    location = response.headers.get("Location", "").strip()
                    if not location or hop == 5:
                        report.update(status="redirect-error", reason="Missing redirect location or too many redirects (maximum 5).")
                        break
                    destination = normalize_url(urljoin(url, location))
                    report["redirects"].append({"url": url, "status": response.status_code, "location": destination})
                    response.close()
                    response = None
                    url = destination
                    continue
                if response.status_code != 200:
                    report.update(status="http-error", reason=f"Expected a complete HTTP 200 image; received HTTP {response.status_code}.")
                    break
                mime = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
                report["content_type"] = mime
                if mime not in MIME_FORMATS:
                    report.update(status="unsupported-content", reason="Response MIME type is not a supported raster image: " + (mime or "missing"))
                    break
                length = response.headers.get("Content-Length")
                if length is not None and (not str(length).isdigit() or int(length) > self.max_bytes):
                    report.update(status="size-limit", reason="Response length is invalid or exceeds the byte limit.")
                    break
                report["bytes_read"] = len(body or b"")
                if not body:
                    report.update(status="decode-error", reason="Empty image response.")
                    break
                # Decompression warnings and malformed/truncated files cannot pass
                # merely because an image-looking header or extension is present.
                report["status"] = "decode-error"
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(io.BytesIO(body)) as image:
                        width, height = image.size
                        fmt = image.format
                        if fmt != MIME_FORMATS[mime]:
                            report.update(status="type-mismatch", reason="Decoded image format differs from the response MIME type.")
                            break
                        if width * height > self.max_pixels:
                            report.update(status="size-limit", reason="Decoded image exceeds the pixel limit.")
                            break
                        image.verify()
                    with Image.open(io.BytesIO(body)) as image:
                        frames = getattr(image, "n_frames", 1)
                        if frames > self.max_frames or frames * width * height > self.max_pixels:
                            report.update(status="size-limit", reason="Animated image exceeds the frame/pixel budget.")
                            break
                        for frame in range(frames):
                            image.seek(frame)
                            image.load()
                report.update(valid=True, status="valid", reason="HTTP response and complete supported image decoding passed.",
                              width=width, height=height, format=fmt, frames=frames,
                              sha256=hashlib.sha256(body).hexdigest())
                break
        except requests.Timeout as exc:
            report.update(status="timeout", reason=str(exc) or "Image request timed out.")
        except requests.RequestException as exc:
            report.update(status="network-error", reason=str(exc))
        except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning, OSError, EOFError, SyntaxError) as exc:
            report.update(status="decode-error", reason=str(exc))
        except (ValueError, TypeError, PipelineError) as exc:
            if getattr(exc, "code", None) == "response-too-large":
                report["status"] = "size-limit"
            report["reason"] = str(exc)
        finally:
            if response is not None:
                response.close()
        self.cache[key] = copy.deepcopy(report)
        return report
