"""Rules of the identity audit (audit_identity.py). No network access."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import audit_identity as ai  # noqa: E402


def card(id, name, governorate='Nineveh', description='A described site with its own history and features.', **extra):
    return {'id': id, 'name': name, 'governorate': governorate, 'description': description, 'sources': [], **extra}


class Pairs(unittest.TestCase):
    def checks(self, records):
        pairs, _ = ai.pair_findings(records)
        return {tuple(sorted(k)): v['checks'] for k, v in pairs.items()}

    def test_one_place_twice(self):
        a = card('site-nineveh-a', 'Qasr One', coordinates_precision='site', latitude=36.3, longitude=43.1)
        b = card('site-nineveh-b', 'Other Name', coordinates_precision='site', latitude=36.3003, longitude=43.1002)
        self.assertIn('same-place', self.checks([a, b])[('site-nineveh-a', 'site-nineveh-b')])

    def test_a_component_is_not_a_duplicate(self):
        a = card('site-nineveh-a', 'Complex', coordinates_precision='site', latitude=36.3, longitude=43.1)
        b = card('site-nineveh-b', 'Gate', parentSite='site-nineveh-a', coordinates_precision='site', latitude=36.3, longitude=43.1)
        self.assertEqual(self.checks([a, b]), {})

    def test_similar_names_ignore_generic_words(self):
        self.assertEqual(self.checks([card('site-anbar-a', 'Al-Barani Mosque', 'Anbar'), card('site-baghdad-b', 'Al-Sarai Mosque', 'Baghdad')]), {})
        found = self.checks([card('site-erbil-a', 'Aliawa', 'Erbil'), card('site-sulaymaniyah-b', 'Ali Awa', 'Sulaymaniyah')])
        self.assertIn('similar-name', found[('site-erbil-a', 'site-sulaymaniyah-b')])

    def test_a_copied_description(self):
        text = 'A palace built in 1820 by the governor Dawud Pasha beside the river, with carved wooden balconies.'
        found = self.checks([card('site-baghdad-a', 'First House', 'Baghdad', text), card('site-baghdad-b', 'Second House', 'Baghdad', text.replace('1820', '1821'))])
        self.assertIn('reused-text', found[('site-baghdad-a', 'site-baghdad-b')])


class Records(unittest.TestCase):
    def checks(self, records):
        return {rid: {check for check, _ in items} for rid, items in ai.record_findings(records).items()}

    def test_a_town_of_another_governorate(self):
        self.assertIn('other-governorate', self.checks([card('site-erbil-a', 'Tell A', 'Erbil', 'A tell in the old quarter of Tikrit.')])['site-erbil-a'])

    def test_distances_and_the_dam_do_not_count(self):
        records = [card('site-duhok-a', 'Tell A', 'Duhok', 'A tell 40 km north of Mosul on the Tigris.'),
                   card('site-duhok-b', 'Tell B', 'Duhok', 'A palace exposed by the falling Mosul Dam reservoir.')]
        self.assertEqual(self.checks(records), {})

    def test_a_description_of_another_card(self):
        records = [card('site-nineveh-a', 'Tell Hassuna', description='A Neolithic site.'),
                   card('site-nineveh-b', 'Yarim Tepe', description='The Halaf village of tell hassuna with painted pottery.')]
        self.assertIn('describes-other', self.checks(records)['site-nineveh-b'])

    def test_a_parent_named_but_not_linked(self):
        records = [card('site-nineveh-a', 'Complex'), card('site-nineveh-b', 'Gate', heritage_status='Monument within site-nineveh-a.')]
        self.assertIn('parent-missing', self.checks(records)['site-nineveh-b'])
        records[1]['parentSite'] = 'site-nineveh-a'
        self.assertNotIn('site-nineveh-b', self.checks(records))

    def test_id_must_match_governorate(self):
        self.assertIn('id-governorate', self.checks([card('site-erbil-a', 'Tell A', 'Duhok')])['site-erbil-a'])


if __name__ == '__main__':
    unittest.main()
