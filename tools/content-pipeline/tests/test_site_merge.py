import copy
import unittest

from hb_pipeline.site_merge import DecisionError, apply_decisions, decision_pairs
from site_fixtures import site


def records():
    return [
        site(id="city", name="Samarra Archaeological City", alternativeNames=["Samarra Archaeological City"]),
        site(id="ruins", name="Abbasid Samarra (ruin-field)", alternativeNames=["Surra Man Ra'a", "samarra archaeological city"],
             sources=[{"url": "https://example.org/site"}, {"url": "https://example.org/abbasid"}],
             latitude=34.3, longitude=43.8, coordinates_source="wikidata:Q9", coordinates_precision="approximate"),
        site(id="palace", name="Palace", parentSite="ruins"),
        site(id="mound", name="Mound"),
        site(id="mosque", name="Mosque"),
    ]


MERGE = {"action": "merge", "keep": "city", "merge": "ruins", "alias": "Abbasid Samarra", "reason": "Same ruin-field."}


class SiteMergeTests(unittest.TestCase):
    def test_merge_keeps_names_adds_aliases_sources_and_coordinates(self):
        before = records()
        result, log = apply_decisions(before, [MERGE])
        self.assertEqual(before, records())
        by_id = {record["id"]: record for record in result}
        self.assertNotIn("ruins", by_id)
        city = by_id["city"]
        self.assertEqual(city["alternativeNames"], ["Samarra Archaeological City", "Abbasid Samarra", "Surra Man Ra'a"])
        self.assertEqual([source["url"] for source in city["sources"]], ["https://example.org/site", "https://example.org/abbasid"])
        self.assertEqual((city["latitude"], city["coordinates_source"]), (34.3, "wikidata:Q9"))
        self.assertEqual(city["mergedFrom"], ["ruins"])
        self.assertIn("Same ruin-field.", city["review_notes"])
        self.assertEqual(by_id["palace"]["parentSite"], "city")
        self.assertEqual(log, ["merged ruins into city"])

    def test_existing_coordinates_are_not_replaced(self):
        data = records()
        data[0].update(latitude=1.0, longitude=2.0)
        result, _ = apply_decisions(data, [MERGE])
        self.assertEqual(result[0]["latitude"], 1.0)

    def test_applying_twice_changes_nothing(self):
        once, _ = apply_decisions(records(), [MERGE])
        twice, log = apply_decisions(once, [MERGE])
        self.assertEqual(once, twice)
        self.assertEqual(log, [])

    def test_component_sets_parent_and_rejects_cycles(self):
        decision = {"action": "component", "parent": "mound", "child": "mosque", "reason": "Stands on the mound."}
        result, _ = apply_decisions(records(), [decision])
        self.assertEqual(result[4]["parentSite"], "mound")
        with self.assertRaises(DecisionError):
            apply_decisions(result, [{"action": "component", "parent": "mosque", "child": "mound", "reason": "Wrong way round."}])

    def test_distinct_changes_nothing_but_settles_every_pair(self):
        decision = {"action": "distinct", "sites": ["mound", "mosque", "palace"], "reason": "Different places."}
        result, log = apply_decisions(records(), [decision])
        self.assertEqual((result, log), (records(), []))
        self.assertEqual(len(decision_pairs([decision])), 3)

    def test_bad_decisions_are_rejected_before_any_change(self):
        for decision in ({"action": "merge", "keep": "city", "merge": "city", "reason": "x"},
                         {"action": "merge", "keep": "city", "merge": "ruins", "reason": " "},
                         {"action": "rename", "reason": "x"},
                         {"action": "merge", "keep": "missing", "merge": "ruins", "reason": "x"},
                         {"action": "distinct", "sites": ["mound", "missing"], "reason": "x"}):
            data = records()
            with self.assertRaises(DecisionError):
                apply_decisions(data, [decision])
            self.assertEqual(data, records())

    def test_a_merged_record_that_reappears_is_merged_again(self):
        once, _ = apply_decisions(records(), [MERGE])
        rebuilt = copy.deepcopy(once) + [records()[1]]
        again, log = apply_decisions(rebuilt, [MERGE])
        self.assertEqual(log, ["merged ruins into city"])
        self.assertEqual([record["id"] for record in again].count("ruins"), 0)
        self.assertEqual(again[0]["mergedFrom"], ["ruins"])
        self.assertEqual(again[0]["review_notes"].count("Merged ruins"), 1)
