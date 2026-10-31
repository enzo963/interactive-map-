import copy
import unittest

from hb_pipeline.duplicates import detect_possible_duplicates
from site_fixtures import site


class SiteDuplicateTests(unittest.TestCase):
    def pair(self, left, right):
        return detect_possible_duplicates([left, right])

    def test_case_spacing_punctuation_and_accents_match(self):
        pairs = self.pair(site(name="Érbil-Citadel", governorate="Arbil"), site(id="two", name=" erbil   citadel ", governorate="Erbil"))
        self.assertIn("same_name", pairs[0]["reasons"])

    def test_alternative_names_and_governorate_aliases(self):
        pairs = self.pair(site(alternativeNames=["Al Hadr"]), site(id="two", name="Al Hadr", governorate="Ninewa"))
        self.assertIn("alternative_name", pairs[0]["reasons"])

    def test_fuzzy_spelling_is_only_a_review_candidate(self):
        pairs = self.pair(site(name="Al Nouri Mosque", sources=[]), site(id="two", name="Al Nuri Mosque", sources=[]))
        self.assertIn("similar_name", pairs[0]["reasons"])
        self.assertTrue(pairs[0]["review_required"])

    def test_same_generic_name_in_different_governorates_is_not_enough(self):
        self.assertEqual(self.pair(site(name="Great Mosque", sources=[]), site(id="two", name="Great Mosque", governorate="Erbil", sources=[])), [])

    def test_shared_url_supports_conflicting_governorate_review(self):
        pairs = self.pair(site(name="Lalish Temple"), site(id="two", name="Lalish Temple", governorate="Duhok"))
        self.assertTrue(pairs[0]["governorate_conflict"])
        self.assertIn("shared_source_url", pairs[0]["reasons"])

    def test_url_normalization_ignores_fragments_default_ports_and_tracking(self):
        a = site(name="Site One", sources=[{"url": "HTTPS://EXAMPLE.ORG:443/site?utm_source=test#one"}])
        b = site(id="two", name="Different Landmark", sources=[{"url": "https://example.org/site#two"}])
        result = self.pair(a, b)
        self.assertEqual(result[0]["reasons"], ["shared_source_url"])
        self.assertEqual(result[0]["confidence"], "low")

    def test_meaningful_query_ids_remain_distinct(self):
        a = site(name="Site One", sources=[{"url": "https://example.org/page?id=1"}])
        b = site(id="two", name="Different Landmark", sources=[{"url": "https://example.org/page?id=2"}])
        self.assertEqual(self.pair(a, b), [])

    def test_known_parent_child_and_siblings_are_not_url_only_duplicates(self):
        parent = site(id="one", name="Citadel", draft_id="draft-parent")
        child = site(id="two", name="Historic Church", parent_draft_id="draft-parent")
        sibling = site(id="three", name="Historic Mosque", parent_draft_id="draft-parent")
        self.assertEqual(self.pair(parent, child), [])
        self.assertEqual(self.pair(child, sibling), [])

    def test_disjoint_content_locators_suppress_shared_overview_match(self):
        a = site(name="First Site", evidence_locations=[{"evidenceId": "one", "json_pointer": "/paragraphs/1"}])
        b = site(id="two", name="Second Place", evidence_locations=[{"evidenceId": "one", "json_pointer": "/paragraphs/2"}])
        self.assertEqual(self.pair(a, b), [])

    def test_reused_ids_are_flagged_even_for_invalid_records(self):
        pairs = self.pair({"id": "same"}, {"id": "same"})
        self.assertEqual(pairs[0]["reasons"], ["same_id"])

    def test_inputs_and_all_records_are_preserved(self):
        records = [site(), site(id="two"), None, {"name": [], "governorate": {}, "sources": [False]}]
        before = copy.deepcopy(records)
        pairs = detect_possible_duplicates(records)
        self.assertEqual(records, before)
        self.assertEqual(len(records), 4)
        self.assertTrue(pairs)

    def test_invalid_threshold_is_rejected(self):
        with self.assertRaises(ValueError):
            detect_possible_duplicates([], 1.1)
