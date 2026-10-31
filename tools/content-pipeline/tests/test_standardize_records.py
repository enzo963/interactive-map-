import json
import tempfile
import unittest
from pathlib import Path

from hb_pipeline.errors import ValidationError
from hb_pipeline.models import DraftRecord
from hb_pipeline.storage import Storage
from standardize_records import REQUIRED, standardize


class StandardizationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.storage = Storage(Path(self.temp.name) / "data")
        self.frontend = [{"id": "site-001", "name": "Hatra", "governorate": "Nineveh", "category": "Archaeological Site", "period": "Parthian", "description": "Existing frontend description", "unesco": True, "has3D": False, "coverImage": None, "galleryImages": [], "sources": []}]
        evidence = {"evidence_id": "test-evidence", "source_name": "Test source", "final_url": "https://example.org/reference", "retrieved_at": "2026-10-31T00:00:00Z"}
        self.storage.save_json(self.storage.evidence_json_path("nineveh", "test", "test-evidence"), evidence)
        self.path = self.storage.draft_json_path("nineveh", "draft-hatra-p504-20261031")
        draft = DraftRecord("draft-hatra-p504-20261031", "nineveh", "needs-review", "Hatra", "An evidence-backed description of the fortified archaeological site for testing.", ["test-evidence"], [], {"status": "unverified", "review_required": True}, {"candidate_name": ["test-evidence"], "candidate_summary": ["test-evidence"], "image_candidates": []}).to_dict()
        draft["possible_existing_frontend_record_id"] = "site-001"
        draft["unesco_context"] = {"status": "inscribed"}
        self.storage.save_json(self.path, draft)

    def test_canonical_fields_evidence_and_existing_identity_are_preserved(self):
        manifest = standardize(self.storage, self.frontend)
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertTrue(set(REQUIRED) <= data.keys())
        self.assertEqual(data["id"], "site-001")
        self.assertEqual(data["governorate"], "Nineveh")
        self.assertTrue(data["unesco"])
        self.assertIsNone(data["has3D"])
        self.assertEqual(data["source_evidence"], ["test-evidence"])
        self.assertEqual(data["sources"][0]["evidenceId"], "test-evidence")
        self.assertEqual(manifest["unique_review_records"], 1)
        self.assertEqual(self.frontend[0]["description"], "Existing frontend description")

    def test_record_standardization_is_idempotent(self):
        standardize(self.storage, self.frontend)
        first = self.path.read_bytes()
        prepared = self.storage.base_dir / "prepared" / "heritage-sites.json"
        first_catalog = prepared.read_bytes()
        standardize(self.storage, self.frontend)
        self.assertEqual(self.path.read_bytes(), first)
        self.assertEqual(prepared.read_bytes(), first_catalog)

    def test_unknown_flags_stay_unknown(self):
        data = json.loads(self.path.read_text(encoding="utf-8"))
        data.pop("unesco_context")
        self.storage.save_json(self.path, data)
        standardize(self.storage, self.frontend)
        result = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertIsNone(result["unesco"])
        self.assertIsNone(result["has3D"])

    def test_unknown_evidence_is_rejected(self):
        data = json.loads(self.path.read_text(encoding="utf-8"))
        data["source_evidence"] = ["missing"]
        self.storage.save_json(self.path, data)
        with self.assertRaises(ValidationError):
            standardize(self.storage, self.frontend)
