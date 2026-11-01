import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import contextlib
import io

from hb_pipeline.evidence_repository import EvidenceRepository, read_json
from hb_pipeline.multi_source import build_evidence_view
from hb_pipeline.storage import Storage
from hb_pipeline.utils import sha256_bytes
from attach_evidence import main


class MultiSourceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.storage = Storage(self.root / 'data')
        self.site = {'id': 'site-test', 'name': 'Original', 'period': '', 'sources': [], 'source_evidence': [], 'provenance': {}}
        self.paths = {}
        self.domains = {'unesco': 'whc.unesco.org', 'krg': 'gov.krd', 'iraqi-antiquities': 'sbah.gov.iq', 'wikimedia-commons': 'commons.wikimedia.org'}
        for source in self.domains:
            self.add_snapshot(source, source, 'A captured statement. Another captured statement.')

    def add_snapshot(self, ref, source, text):
        raw = ('<html><body><p>' + text + '</p><img alt="Captured image" src="https://example.org/photo.jpg"></body></html>').encode()
        html = self.storage.save_html('test', source, ref, raw)
        extraction = self.storage.extraction_json_path('test', source, ref)
        self.storage.save_json(extraction, {'paragraphs': [text]})
        manifest = self.storage.evidence_json_path('test', source, ref)
        self.storage.save_json(manifest, {'evidence_id': ref, 'source_id': source, 'source_name': 'Untrusted display name', 'trust_tier': 99,
            'final_url': 'https://' + self.domains[source] + '/example', 'retrieved_at': '2026-10-31T10:00:00+00:00',
            'http_status': 200, 'robots': {'status': 'allowed'}, 'html_path': str(html.relative_to(self.root)), 'sha256': sha256_bytes(raw)})
        self.paths[ref] = (html, extraction, manifest)

    def claim(self, source='unesco', field='period', value='Roman', id=None):
        return {'assertionId': id or source + '-' + field, 'field': field, 'value': value, 'evidenceId': source,
                'locator': {'artifact': str(self.paths[source][1].relative_to(self.root)), 'json_pointer': '/paragraphs/0', 'text_match': 'A captured statement.'}}

    def build(self, *claims, site=None):
        return build_evidence_view(site or self.site, {'siteId': 'site-test', 'assertions': list(claims)}, EvidenceRepository(self.root / 'data'))

    def test_three_primary_sources_agree_and_preserve_origins(self):
        result = self.build(*(self.claim(source) for source in ['unesco', 'krg', 'iraqi-antiquities']))
        field = result['field_evidence']['period']
        self.assertEqual(len(field['alternatives']), 1)
        self.assertEqual(len(field['alternatives'][0]['evidenceIds']), 3)
        self.assertEqual(len(result['sources']), 3)
        self.assertEqual(len(result['provenance']['period']), 3)
        self.assertEqual(result['period'], '')
        self.assertEqual(self.site['sources'], [])
        self.assertTrue(all(entry['sourceName'] != 'Untrusted display name' for entry in result['evidence_assertions']))

    def test_equal_tiers_disagree_without_preference_regardless_of_order(self):
        claims = [self.claim('unesco'), self.claim('krg', value='Medieval'), self.claim('iraqi-antiquities', value='Medieval')]
        for batch in (claims, claims[::-1]):
            field = self.build(*batch)['field_evidence']['period']
            self.assertIsNone(field['preferred_value'])
            self.assertEqual(field['resolution_status'], 'tie-needs-review')
            self.assertTrue(field['has_conflict'])

    def test_stronger_image_source_preferred_but_conflict_retained(self):
        result = self.build(self.claim('unesco', 'mediaLicense', 'License A'), self.claim('wikimedia-commons', 'mediaLicense', 'License B'))
        field = result['field_evidence']['mediaLicense']
        self.assertEqual(field['preferred_value'], 'License A')
        self.assertEqual(len(field['alternatives']), 2)
        self.assertEqual(field['resolution_status'], 'preferred-pending-review')
        self.assertTrue(result['reliability_review']['has_conflicts'])

    def test_commons_does_not_supply_historical_facts(self):
        claim = self.claim('wikimedia-commons', 'unesco', True)
        result = self.build(claim)
        self.assertFalse(result['evidence_assertions'][0]['eligible'])
        self.assertEqual(result['evidence_assertions'][0]['original_claim'], claim)
        self.assertEqual(len(result['reliability_review']['invalid_assertions']), 1)
        self.assertEqual(result['field_evidence'], {})

    def test_original_canonical_value_never_overwritten(self):
        self.site['period'] = 'Existing unverified period'
        result = self.build(self.claim())
        self.assertEqual(result['period'], self.site['period'])
        self.assertTrue(result['field_evidence']['period']['differs_from_current'])
        self.assertEqual(result['reliability_review']['conflict_fields'], ['period'])

    def test_current_registry_controls_tier_not_claim_or_manifest(self):
        claim = self.claim()
        claim['trust_tier'] = 0
        result = self.build(claim)
        entry = result['evidence_assertions'][0]
        self.assertEqual(entry['trust_tier'], 1)
        self.assertEqual(entry['recorded_trust_tier'], 99)
        self.assertTrue(entry['issues'])

    def test_source_spoofing_is_invalid(self):
        claim = self.claim()
        claim['sourceId'] = 'krg'
        self.assertFalse(self.build(claim)['evidence_assertions'][0]['eligible'])

    def test_unknown_value_cannot_outvote_known(self):
        result = self.build(self.claim('unesco', value=None), self.claim('krg', value='Roman'))
        self.assertEqual(result['field_evidence']['period']['preferred_value'], 'Roman')
        self.assertFalse(result['field_evidence']['period']['has_conflict'])

    def test_boolean_false_is_known_not_unknown(self):
        result = self.build(self.claim(field='unesco', value=False))
        self.assertIs(result['field_evidence']['unesco']['preferred_value'], False)

    def test_malformed_and_duplicate_assertions_retained(self):
        claim = self.claim()
        result = self.build(claim, copy.deepcopy(claim), 'malformed', self.claim('krg'))
        self.assertEqual(len(result['evidence_assertions']), 4)
        self.assertEqual(len(result['reliability_review']['invalid_assertions']), 3)
        self.assertTrue(result['evidence_assertions'][3]['eligible'])

    def test_incremental_attachment_and_rerun_preserve_claims(self):
        first = self.build(self.claim())
        second = self.build(self.claim('krg', value='Medieval'), site=first)
        repeated = self.build(self.claim('krg', value='Medieval'), site=second)
        self.assertEqual(len(repeated['evidence_assertions']), 2)
        self.assertEqual(repeated['field_evidence']['period']['resolution_status'], 'tie-needs-review')

    def test_changed_claim_with_reused_id_preserves_both_as_invalid(self):
        first = self.build(self.claim())
        result = self.build(self.claim(value='Medieval'), site=first)
        self.assertEqual(len(result['evidence_assertions']), 2)
        self.assertEqual(len(result['reliability_review']['invalid_assertions']), 2)

    def test_raw_tampering_rejected(self):
        self.paths['unesco'][0].write_text('tampered', encoding='utf-8')
        self.assertFalse(self.build(self.claim())['evidence_assertions'][0]['eligible'])

    def test_wrong_domain_rejected(self):
        path = self.paths['unesco'][2]
        data = read_json(path)
        data['final_url'] = 'https://example.org/fake'
        self.storage.save_json(path, data)
        self.assertFalse(self.build(self.claim())['evidence_assertions'][0]['eligible'])

    def test_unsafe_and_cross_evidence_locators_rejected(self):
        for artifact in ('../outside.json', str(self.paths['krg'][1].relative_to(self.root))):
            claim = self.claim()
            claim['locator']['artifact'] = artifact
            self.assertFalse(self.build(claim)['evidence_assertions'][0]['eligible'])

    def test_fabricated_extraction_not_present_in_raw_is_rejected(self):
        self.storage.save_json(self.paths['unesco'][1], {'paragraphs': ['Invented statement']})
        claim = self.claim()
        claim['locator']['text_match'] = 'Invented statement'
        self.assertFalse(self.build(claim)['evidence_assertions'][0]['eligible'])

    def test_html_attributes_can_support_image_evidence(self):
        claim = self.claim('wikimedia-commons', 'coverImage.src', 'https://example.org/photo.jpg')
        claim['locator'] = {'artifact': str(self.paths['wikimedia-commons'][0].relative_to(self.root)), 'selector': 'img', 'text_match': 'https://example.org/photo.jpg'}
        self.assertTrue(self.build(claim)['evidence_assertions'][0]['eligible'])

    def test_invalid_pointer_and_selector_flagged(self):
        for pointer in ('/paragraphs/99', '/paragraphs/-1', '/missing', '/bad~2escape'):
            claim = self.claim()
            claim['locator']['json_pointer'] = pointer
            self.assertFalse(self.build(claim)['evidence_assertions'][0]['eligible'])
        claim['locator'] = {'artifact': str(self.paths['unesco'][0].relative_to(self.root)), 'selector': '[', 'text_match': 'A captured statement.'}
        self.assertFalse(self.build(claim)['evidence_assertions'][0]['eligible'])

    def test_no_autoapproval_even_without_conflicts(self):
        result = self.build(self.claim())
        self.assertEqual(result['status'], 'needs-review')
        self.assertEqual(result['verification']['status'], 'unverified')
        self.assertFalse(result['reliability_review']['automatically_approved'])
        self.assertTrue(result['reliability_review']['manual_review_required'])

    def test_existing_sources_and_provenance_preserved(self):
        self.site.update(sources=[{'evidenceId': 'legacy'}], source_evidence=['legacy'], provenance={'name': ['legacy']})
        result = self.build(self.claim())
        self.assertEqual(result['sources'][0], {'evidenceId': 'legacy'})
        self.assertEqual(result['provenance']['name'], ['legacy'])
        self.assertIn('legacy', result['source_evidence'])

    def test_malformed_media_and_flags_are_rejected(self):
        for field, value in [('coverImage.src', 'javascript:alert(1)'), ('coverImage', {'src': '//bad.example/photo'}),
                            ('galleryImages', [{'src': 'http://127.0.0.1/photo'}]), ('galleryImages', ['not-an-object']),
                            ('alternativeNames', [123]), ('unesco', 'true')]:
            with self.subTest(field=field, value=value):
                self.assertFalse(self.build(self.claim(field=field, value=value))['evidence_assertions'][0]['eligible'])

    def test_ambiguous_evidence_ids_cannot_be_attached(self):
        duplicate = self.paths['unesco'][2].parent / 'duplicate.evidence.json'
        duplicate.write_bytes(self.paths['unesco'][2].read_bytes())
        self.assertFalse(self.build(self.claim())['evidence_assertions'][0]['eligible'])

    def test_claims_for_wrong_site_rejected(self):
        with self.assertRaises(ValueError):
            build_evidence_view(self.site, {'siteId': 'other', 'assertions': []}, EvidenceRepository(self.root / 'data'))

    def test_cli_writes_separate_review_copy_and_preserves_inputs(self):
        sitepath, claimpath, output = self.root/'site.json', self.root/'claims.json', self.root/'review.json'
        self.storage.save_json(sitepath, self.site)
        self.storage.save_json(claimpath, {'siteId': 'site-test', 'assertions': [self.claim()]})
        before = sitepath.read_bytes()
        with patch('attach_evidence.BASE', self.root), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main([str(sitepath), str(claimpath), '--output', str(output)]), 0)
        self.assertTrue(output.exists())
        self.assertEqual(sitepath.read_bytes(), before)
        with patch('attach_evidence.BASE', self.root), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main([str(sitepath), str(claimpath), '--output', str(sitepath)]), 1)

    def test_strict_json_rejects_duplicate_keys_and_nan(self):
        path = self.root/'invalid.json'
        for raw in ('{"a":1,"a":2}', '{"a":NaN}'):
            path.write_text(raw, encoding='utf-8')
            with self.assertRaises(ValueError):
                read_json(path)


if __name__ == '__main__':
    unittest.main()
