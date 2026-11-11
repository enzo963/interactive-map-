import copy
import unittest

from hb_pipeline.errors import ValidationError
from hb_pipeline.extractor import extract_page
from hb_pipeline.models import DraftRecord
from hb_pipeline.utils import ensure_http_url, normalize_url
from hb_pipeline.validation import validate_draft

SUMMARY = "A documented archaeological site with a substantial history and surviving architecture."
HTML = f"<html><head><title>Heritage site</title></head><body><h1>Heritage site</h1><p>{SUMMARY}</p></body></html>".encode()


class URLTests(unittest.TestCase):
    def test_rejects_invalid_addresses(self):
        for url in (None, "", "file:///tmp/a", "https:///x", "https://user:pass@example.com", "https://example.com:99999", "https://example.com:0", "https://example.com/a b", "https://example.com/\n", "https://example.com/%0a", "https://example.com/%zz", "https://127.0.0.1/", "http://[::1]/", "https://localhost/", "https://bad_host.example/", "https://example.com/\\evil"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                ensure_http_url(url)

    def test_url_identity_preserves_meaningful_parts(self):
        self.assertEqual(normalize_url("HTTPS://EXAMPLE.COM:443#section"), "https://example.com/")
        self.assertNotEqual(normalize_url("https://example.com/a?x=1"), normalize_url("https://example.com/a?x=2"))
        self.assertEqual(ensure_http_url(" https://example.com/a%20b "), "https://example.com/a%20b")


class ExtractionTests(unittest.TestCase):
    def test_rejects_empty_and_error_pages(self):
        for html in (b"", b"<h1>Site</h1>", f"<title>Access denied</title><p>{SUMMARY}</p>".encode()):
            with self.subTest(html=html), self.assertRaises(ValidationError):
                extract_page(html, "https://example.com/site")

    def test_deduplicates_text_and_validates_media(self):
        html = HTML.replace(b"</body>", f'<p>{SUMMARY}</p><img src="/a.jpg#one"><img src="/a.jpg#two"><img src="javascript:alert(1)"><img src=""><link rel="canonical" href="javascript:alert(1)"></body>'.encode())
        result = extract_page(html, "https://example.com/site")
        self.assertEqual(result.paragraphs, [SUMMARY])
        self.assertEqual(len(result.image_candidates), 1)
        self.assertEqual(result.image_candidates[0]["url"], "https://example.com/a.jpg")
        self.assertEqual(result.canonical_url, "")

    def test_heading_can_replace_missing_title(self):
        result = extract_page(f"<h1>Erbil Citadel</h1><p>{SUMMARY}</p>".encode(), "https://example.com/site")
        self.assertEqual(result.headings, ["Erbil Citadel"])


class DraftTests(unittest.TestCase):
    def setUp(self):
        self.draft = DraftRecord("draft-one", "erbil", "needs-review", "Erbil Citadel", SUMMARY, ["one"], [], {"status": "unverified", "review_required": True}, {"candidate_name": ["one"], "candidate_summary": ["one"], "image_candidates": []})

    def test_valid_draft(self):
        validate_draft(self.draft, {"one"})

    def test_rejects_invalid_fields_and_references(self):
        changes = [
            {"draft_id": "../../unsafe"}, {"candidate_name": " "}, {"candidate_summary": "short"}, {"status": "published"},
            {"source_evidence": ["unknown"]}, {"source_evidence": ["one", "one"]},
            {"verification": {"status": "verified", "review_required": False}},
            {"provenance": {"candidate_name": [], "candidate_summary": ["one"], "image_candidates": []}},
            {"image_candidates": [{"url": "javascript:alert(1)"}], "provenance": {"candidate_name": ["one"], "candidate_summary": ["one"], "image_candidates": ["one"]}},
        ]
        for fields in changes:
            draft = copy.deepcopy(self.draft)
            for key, value in fields.items():
                setattr(draft, key, value)
            with self.subTest(fields=fields), self.assertRaises(ValidationError):
                validate_draft(draft, {"one"})
