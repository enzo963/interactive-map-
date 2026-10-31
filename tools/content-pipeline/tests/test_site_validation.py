import copy
import unittest

from hb_pipeline.site_validation import REQUIRED_FIELDS, validate_site_record, valid_access_date
from site_fixtures import site


class SiteValidationTests(unittest.TestCase):
    def test_complete_record_passes_without_mutation(self):
        record = site()
        before = copy.deepcopy(record)
        result = validate_site_record(record, {"evidence-one"})
        self.assertTrue(result["is_valid"])
        self.assertEqual(result["issues"], [])
        self.assertEqual(record, before)

    def test_each_required_field_is_checked(self):
        for field in REQUIRED_FIELDS:
            record = site()
            del record[field]
            with self.subTest(field=field):
                result = validate_site_record(record)
                self.assertFalse(result["is_valid"])
                self.assertTrue(any(issue["field"] == field and issue["code"] == "required" for issue in result["issues"]))

    def test_malformed_record_roots_do_not_crash(self):
        for value in (None, [], "site", 17, True):
            with self.subTest(value=value):
                self.assertFalse(validate_site_record(value)["is_valid"])

    def test_wrong_boolean_types_are_not_coerced(self):
        for field in ("unesco", "has3D"):
            for value in ("false", "true", 0, 1, [], {}):
                with self.subTest(field=field, value=value):
                    self.assertFalse(validate_site_record(site(**{field: value}))["is_valid"])

    def test_unknowns_and_incomplete_values_require_review(self):
        result = validate_site_record(site(unesco=None, has3D=None, period="", category="", coverImage=None))
        self.assertTrue(result["is_valid"])
        self.assertEqual(result["status"], "needs-review")
        self.assertTrue(all(item["severity"] == "warning" for item in result["issues"]))

    def test_blank_identity_and_description_are_invalid(self):
        for field in ("id", "name", "governorate", "description"):
            self.assertFalse(validate_site_record(site(**{field: " "}))["is_valid"])
        self.assertFalse(validate_site_record(site(id="../bad"))["is_valid"])
        self.assertFalse(validate_site_record(site(governorate="Atlantis"))["is_valid"])

    def test_governorate_aliases_are_accepted(self):
        for name in ("Ninewa", "Ninawa", "Nineveh Governorate", "Dohuk", "Arbil", "Slemani"):
            self.assertTrue(validate_site_record(site(governorate=name))["is_valid"])

    def test_missing_sources_and_malformed_nested_data(self):
        for sources in ([], None, "source", [None], [{"sourceName": ""}], [{"sourceName": "Reference", "url": "javascript:alert(1)", "evidenceId": 5, "accessedAt": "2026-02-30"}]):
            with self.subTest(sources=sources):
                self.assertFalse(validate_site_record(site(sources=sources))["is_valid"])

    def test_unknown_evidence_and_mismatched_provenance(self):
        self.assertFalse(validate_site_record(site(), {"another-evidence"})["is_valid"])
        self.assertFalse(validate_site_record(site(source_evidence=["another-evidence"]), {"evidence-one", "another-evidence"})["is_valid"])
        for refs in (None, [], [False]):
            self.assertFalse(validate_site_record(site(source_evidence=refs))["is_valid"])

    def test_real_calendar_dates_and_timezones_are_required(self):
        for value in ("2026-10-31", "2024-02-29", "2026-10-31T12:00:00Z", "2026-10-31T15:00:00+03:00"):
            self.assertTrue(valid_access_date(value), value)
        for value in ("2026-02-30", "2025-02-29", "today", "2026-10-31T12:00:00", "2026-10-31T24:00:00Z", "2026-10-31T12:00:00+03:99", None, 1):
            self.assertFalse(valid_access_date(value), value)

    def test_image_shape_urls_and_metadata(self):
        for changes in ({"coverImage": "/image.jpg"}, {"coverImage": {}}, {"galleryImages": "bad"}, {"galleryImages": [False]}, {"coverImage": {"src": "javascript:alert(1)", "alt": "x", "caption": "", "credit": "x", "license": "x"}}):
            self.assertFalse(validate_site_record(site(**changes))["is_valid"])
        result = validate_site_record(site(coverImage={"src": "/local.jpg", "alt": "", "caption": "", "credit": "", "license": ""}))
        self.assertTrue(result["is_valid"])
        self.assertEqual(result["status"], "needs-review")

    def test_coordinates_and_alias_types(self):
        for value in (True, "35", float("nan"), float("inf"), 91, 10**1000):
            self.assertFalse(validate_site_record(site(latitude=value))["is_valid"])
        self.assertFalse(validate_site_record(site(longitude=-181))["is_valid"])
        self.assertFalse(validate_site_record(site(alternativeNames="Al Hadr"))["is_valid"])
        self.assertTrue(validate_site_record(site(alternativeNames=["Al Hadr"]))["is_valid"])
