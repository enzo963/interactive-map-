import base64
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from hb_pipeline.site_review import load_evidence_ids, load_record_file, review_record_files
from review_records import main
from site_fixtures import site


class SiteReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.path = self.root / "sites.json"

    def write(self, data):
        self.path.write_text(json.dumps(data), encoding="utf-8")

    def test_invalid_approved_record_is_marked_review_and_original_is_retained(self):
        self.write([site(sources=[], status="approved", verification={"status": "verified"})])
        before = self.path.read_bytes()
        report = review_record_files([self.path], {"evidence-one"})
        item = report["items"][0]
        self.assertFalse(item["validation"]["is_valid"])
        self.assertEqual(item["status"], "needs-review")
        self.assertEqual(item["record"]["status"], "needs-review")
        self.assertEqual(item["record"]["verification"]["status"], "unverified")
        self.assertEqual(item["original_record"]["status"], "approved")
        self.assertEqual(self.path.read_bytes(), before)

    def test_valid_records_are_never_auto_approved(self):
        self.write([site()])
        report = review_record_files([self.path], {"evidence-one"})
        self.assertTrue(report["items"][0]["validation"]["is_valid"])
        self.assertEqual(report["automatically_approved"], 0)
        self.assertTrue(report["items"][0]["review_required"])

    def test_duplicates_keep_both_records_and_bidirectional_flags(self):
        self.write([site(), site(id="two", alternativeNames=["Al Hadr"])])
        before = self.path.read_bytes()
        report = review_record_files([self.path], {"evidence-one"})
        self.assertEqual(report["summary"]["input_items"], 2)
        self.assertEqual(report["summary"]["possible_duplicate_pairs"], 1)
        self.assertTrue(all(item["possible_duplicates"] for item in report["items"]))
        self.assertEqual(report["deleted_records"], 0)
        self.assertEqual(report["merged_records"], 0)
        self.assertEqual(self.path.read_bytes(), before)

    def test_bad_json_duplicate_keys_nan_and_encoding_are_retained_for_review(self):
        for raw in (b"{broken", b'{"name":"one","name":"two"}', b'{"latitude":NaN}', b"\xff\xfe\xff", b'{"name":"\\ud800"}', b'{"\\ud800":1,"\\ud800":2}'):
            self.path.write_bytes(raw)
            report = review_record_files([self.path])
            item = report["items"][0]
            self.assertFalse(item["validation"]["is_valid"])
            self.assertEqual(base64.b64decode(item["raw_input_base64"]), raw)
            self.assertEqual(self.path.read_bytes(), raw)

    def test_malformed_entries_do_not_hide_valid_siblings(self):
        self.write([None, 1, site()])
        report = review_record_files([self.path], {"evidence-one"})
        self.assertEqual(report["summary"]["input_items"], 3)
        self.assertEqual(report["summary"]["invalid_items"], 2)

    def test_empty_and_missing_input_are_reviewable(self):
        self.write([])
        self.assertFalse(review_record_files([self.path])["items"][0]["validation"]["is_valid"])
        self.assertFalse(review_record_files([self.root / "missing.json"])["items"][0]["validation"]["is_valid"])

    def test_wrapper_and_single_record_inputs(self):
        self.write({"sites": [site()]})
        self.assertEqual(len(load_record_file(self.path)), 1)
        self.write(site())
        self.assertEqual(len(load_record_file(self.path)), 1)

    def test_cli_writes_flagged_report_and_rejects_input_overwrite(self):
        self.write([site(sources=[])])
        output = self.root / "review.json"
        with contextlib.redirect_stdout(io.StringIO()):
            code = main([str(self.path), "--output", str(output), "--evidence-dir", str(self.root / "raw")])
        self.assertEqual(code, 2)
        self.assertTrue(output.exists())
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            main([str(self.path), "--output", str(self.path)])


    def test_repeated_file_argument_does_not_invent_a_duplicate(self):
        self.write([site()])
        report = review_record_files([self.path, self.path], {"evidence-one"})
        self.assertEqual(report["summary"]["input_items"], 1)
        self.assertEqual(report["summary"]["possible_duplicate_pairs"], 0)

    def test_corrupt_evidence_index_is_reported_without_stopping_audit(self):
        raw = self.root / "raw"
        raw.mkdir()
        (raw / "broken.evidence.json").write_text("{broken", encoding="utf-8")
        ids, issues = load_evidence_ids(raw)
        self.assertEqual(ids, set())
        self.assertEqual(len(issues), 1)
        self.assertIn("broken.evidence.json", issues[0]["path"])
