import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from main import fetch_page
from hb_pipeline.config import SourceRegistry
from hb_pipeline.errors import StorageError, ValidationError
from hb_pipeline.fetcher import FetchResult
from hb_pipeline.models import RobotsDecision
from hb_pipeline.storage import Storage
from test_validation import HTML


class IngestionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.storage = Storage(Path(self.temp.name) / "data")
        self.registry = SourceRegistry()
        self.result = FetchResult("https://whc.unesco.org/a", "https://whc.unesco.org/a", 200, "text/html", HTML, RobotsDecision("allowed", "robots", "a", "test"))

    def ingest(self):
        with patch("main.TrustedFetcher") as fetcher, contextlib.redirect_stdout(io.StringIO()):
            fetcher.return_value.fetch.return_value = self.result
            return fetch_page(self.registry, self.storage, "unesco", "erbil", self.result.requested_url)

    def test_repeat_is_idempotent(self):
        self.ingest()
        self.ingest()
        self.assertEqual(len(list(self.storage.raw_dir.rglob("*.evidence.json"))), 1)
        self.assertEqual(len(list(self.storage.drafts_dir.rglob("*.json"))), 1)

    def test_changed_url_same_content_is_duplicate(self):
        self.ingest()
        self.result.requested_url = self.result.final_url = "https://whc.unesco.org/alternate"
        self.ingest()
        self.assertEqual(len(list(self.storage.drafts_dir.rglob("*.json"))), 1)

    def test_changed_content_keeps_revision(self):
        self.ingest()
        self.result.body = HTML.replace(b"surviving architecture", b"newly documented structures")
        self.ingest()
        evidence = [json.loads(path.read_text(encoding="utf-8")) for path in self.storage.raw_dir.rglob("*.evidence.json")]
        self.assertEqual(len(evidence), 2)
        self.assertTrue(any(any("previous evidence" in note for note in item["notes"]) for item in evidence))

    def test_invalid_extraction_leaves_no_artifacts(self):
        self.result.body = b"<h1>Access denied</h1>"
        with self.assertRaises(ValidationError):
            self.ingest()
        self.assertEqual(list(self.storage.raw_dir.rglob("*.*")), [])
        self.assertEqual(list(self.storage.drafts_dir.rglob("*.*")), [])

    def test_invalid_draft_leaves_no_artifacts(self):
        with patch("main.validate_draft", side_effect=ValidationError("invalid draft")), self.assertRaises(ValidationError):
            self.ingest()
        self.assertEqual(list(self.storage.raw_dir.rglob("*.*")), [])

    def test_corrupt_evidence_reports_repair_path(self):
        self.ingest()
        path = next(self.storage.raw_dir.rglob("*.evidence.json"))
        path.write_text("broken", encoding="utf-8")
        with self.assertRaisesRegex(StorageError, "repair existing evidence"):
            self.ingest()

    def test_non_json_values_do_not_replace_existing_record(self):
        path = Path(self.temp.name) / "record.json"
        self.storage.save_json(path, {"valid": True})
        with self.assertRaises(StorageError):
            self.storage.save_json(path, {"value": float("nan")})
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"valid": True})
