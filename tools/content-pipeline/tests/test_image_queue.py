"""Identity and ordering rules of the primary-image queue (image_queue.py). No network access."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import image_queue as iq  # noqa: E402


def entity(labels, p31=(), coords=None, country=None, description=''):
    claims = {'P31': [{'mainsnak': {'datavalue': {'value': {'id': q}}}} for q in p31]}
    if coords:
        claims['P625'] = [{'mainsnak': {'datavalue': {'value': {'latitude': coords[0], 'longitude': coords[1]}}}}]
    if country:
        claims['P17'] = [{'mainsnak': {'datavalue': {'value': {'id': country}}}}]
    return {'labels': {'en': {'value': labels[0]}}, 'aliases': {'en': [{'value': a} for a in labels[1:]]},
            'claims': claims, 'descriptions': {'en': {'value': description}}}


class NameMatch(unittest.TestCase):
    def test_a_shared_generic_word_is_not_a_match(self):
        self.assertEqual(iq.name_match(['Great Mosque of Amedi'], entity(['Great Mosque of Samarra'])), 0)

    def test_a_distinctive_word_matches(self):
        self.assertGreater(iq.name_match(['Al-Wazir Mosque'], entity(['Al-Wazeer Mosque', 'Wazir Mosque'])), 0.5)

    def test_card_names_include_the_name_without_its_place(self):
        names = iq.card_names({'name': 'Al-Qaysariyah Market, Kirkuk', 'alternativeNames': ['Qaysari (old bazaar)']})
        self.assertIn('Al-Qaysariyah Market', names)
        self.assertIn('old bazaar', names)


class Place(unittest.TestCase):
    def test_items_outside_iraq_are_rejected(self):
        self.assertFalse(iq.in_iraq(entity(['Qishla'], coords=(38.1, 46.3))))
        self.assertTrue(iq.in_iraq(entity(['Qushla'], coords=(33.34, 44.39))))
        self.assertTrue(iq.in_iraq(entity(['X'], country='Q796')))

    def test_settlements_are_only_for_settlement_cards(self):
        self.assertFalse(iq.is_settlement_card({'category': 'Mosque'}))
        self.assertTrue(iq.is_settlement_card({'category': 'Historic City'}))

    def test_distance(self):
        self.assertAlmostEqual(iq.km((33.34, 44.38), (33.34, 44.38)), 0)
        self.assertLess(iq.km((33.3412, 44.386), (33.3393, 44.3824)), 1)


class Importance(unittest.TestCase):
    def test_approved_and_unesco_outrank_the_rest(self):
        tiers = {'whc.unesco.org': '1'}
        approved, _ = iq.importance({'id': 'a', 'status': 'approved', 'sources': []}, {}, tiers)
        unesco, why = iq.importance({'id': 'b', 'status': 'needs-review', 'unesco': True,
                                     'sources': [{'url': 'https://whc.unesco.org/en/list/1'}]}, {}, tiers)
        plain, _ = iq.importance({'id': 'c', 'status': 'needs-review', 'sources': []}, {}, tiers)
        self.assertGreater(approved, unesco)
        self.assertGreater(unesco, plain)
        self.assertIn('tier 1 source', why)

    def test_flag_reasons_are_explained(self):
        for key in ('no-wikidata-item', 'no-free-photograph', 'only-unrelated-images', 'not-recognisable'):
            self.assertTrue(iq.REASONS[key])


if __name__ == '__main__':
    unittest.main()
