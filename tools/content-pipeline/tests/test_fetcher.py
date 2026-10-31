import unittest
from unittest.mock import Mock

import requests

from hb_pipeline.errors import DomainNotAllowedError, FetchError, RobotsPolicyError
from hb_pipeline.fetcher import TrustedFetcher
from hb_pipeline.models import RobotsDecision, SourceSpec
from hb_pipeline.robots import RobotsChecker


def response(url, status=200, body=b"<title>Example</title>", headers=None):
    result = requests.Response()
    result.url = url
    result.status_code = status
    result._content = body
    result._content_consumed = True
    result.headers.update(headers or {"Content-Type": "text/html"})
    return result


class FetchTests(unittest.TestCase):
    def setUp(self):
        self.source = SourceSpec("test", "Test", 1, ["example.com"])
        self.fetcher = TrustedFetcher(min_delay_seconds=0)
        self.fetcher.session = Mock()
        self.fetcher.robots_checker = Mock()
        self.fetcher.robots_checker.check.side_effect = lambda url: RobotsDecision("allowed", "https://example.com/robots.txt", url, "test")

    def test_redirect_outside_allowlist_is_never_requested(self):
        self.fetcher.session.get.return_value = response("https://example.com/a", 302, headers={"Location": "https://evil.example/b"})
        with self.assertRaises(DomainNotAllowedError):
            self.fetcher.fetch("https://example.com/a", self.source)
        self.assertEqual(self.fetcher.session.get.call_count, 1)
        self.assertFalse(self.fetcher.session.get.call_args.kwargs["allow_redirects"])

    def test_redirect_policy_checked_before_destination_fetch(self):
        self.fetcher.session.get.return_value = response("https://example.com/a", 302, headers={"Location": "/b"})
        self.fetcher.robots_checker.check.side_effect = [RobotsDecision("allowed", "robots", "a", "test"), RobotsDecision("denied", "robots", "b", "test")]
        with self.assertRaises(RobotsPolicyError):
            self.fetcher.fetch("https://example.com/a", self.source)
        self.assertEqual(self.fetcher.session.get.call_count, 1)

    def test_valid_redirect_retains_requested_and_final_url(self):
        self.fetcher.session.get.side_effect = [response("https://example.com/a", 302, headers={"Location": "/b"}), response("https://example.com/b")]
        result = self.fetcher.fetch("https://example.com/a", self.source)
        self.assertEqual(result.requested_url, "https://example.com/a")
        self.assertEqual(result.final_url, "https://example.com/b")
        self.assertEqual(self.fetcher.robots_checker.check.call_count, 2)

    def test_missing_location_loop_bad_status_and_content(self):
        for replies in ([response("https://example.com/a", 302)], [response("https://example.com/a", 302, headers={"Location": "/a"})], [response("https://example.com/a", 404)], [response("https://example.com/a", headers={"Content-Type": "application/pdf"})], [response("https://example.com/a", body=b"")]):
            self.fetcher.session.get.side_effect = replies
            with self.subTest(replies=replies), self.assertRaises(FetchError):
                self.fetcher.fetch("https://example.com/a", self.source)

    def test_robots_redirect_and_html_are_not_permission(self):
        session = Mock()
        checker = RobotsChecker(session, "test")
        for reply in (response("https://example.com/robots.txt", 302, headers={"Location": "https://evil.example/robots.txt"}), response("https://example.com/robots.txt", body=b"<html>Sign in</html>")):
            session.get.return_value = reply
            self.assertFalse(checker.check("https://example.com/a").may_fetch)
            self.assertFalse(session.get.call_args.kwargs["allow_redirects"])


    def test_robots_plain_text_without_directives_is_not_permission(self):
        session = Mock()
        session.get.return_value = response("https://example.com/robots.txt", body=b"Service unavailable", headers={"Content-Type": "text/plain"})
        self.assertEqual(RobotsChecker(session, "test").check("https://example.com/a").status, "error")

    def test_robots_explicit_policy_is_respected(self):
        session = Mock()
        for directive, expected in ((b"Allow: /", True), (b"Disallow: /", False)):
            session.get.return_value = response("https://example.com/robots.txt", body=b"User-agent: *\n" + directive, headers={"Content-Type": "text/plain"})
            self.assertEqual(RobotsChecker(session, "test").check("https://example.com/a").may_fetch, expected)
