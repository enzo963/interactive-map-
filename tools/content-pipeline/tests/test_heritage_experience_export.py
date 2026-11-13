import copy
import json
import unittest

import test_logging_review_export as fixtures
from hb_pipeline.exporter import export_records


class HeritageExperienceExportTests(unittest.TestCase):
    # Exercise real evidence and saved ledger decisions without inheriting fixture tests.
    setUp = fixtures.ReviewExportTests.setUp
    add_evidence = fixtures.ReviewExportTests.add_evidence
    refresh = fixtures.ReviewExportTests.refresh
    write_input = fixtures.ReviewExportTests.write_input
    approve = fixtures.ReviewExportTests.approve

    def heritage_record(self):
        claim = dict(siteId='site-one', verification_status='approved', reviewedBy='Historian',
            reviewedAt='2026-11-01', sourceRefs=['site-evidence'], internal_notes={'private': True})
        self.record.update(preservation_status='Legacy condition, unverified',
            preservation=dict(claim, state='restored', asOf=None, summary='Restored fabric.'),
            story_sections=[dict(claim, id='history', type='history', text='Documented history.')],
            historical_events=[dict(claim, id='foundation', type='construction', title='Foundation',
                year=-500, endYear=-490, precision='approximate', date=None, description='Recorded range.')])
        return self.record

    def test_typed_claims_and_refs_survive_without_private_fields_or_mutation(self):
        record = self.heritage_record()
        before = copy.deepcopy(record)
        self.approve()
        output, report = export_records([record], self.workflow)
        self.assertEqual(len(output), 1, report)
        exported = output[0]
        self.assertEqual(exported['preservation']['state'], 'restored')
        self.assertIsNone(exported['preservation']['asOf'])
        self.assertEqual(exported['historical_events'][0]['year'], -500)
        self.assertEqual(exported['historical_events'][0]['endYear'], -490)
        self.assertEqual(exported['story_sections'][0]['sourceRefs'], ['site-evidence'])
        self.assertEqual(exported['preservation_status'], record['preservation_status'])
        self.assertNotIn('internal_notes', json.dumps(exported))
        self.assertEqual(before, record)
        exported['preservation']['sourceRefs'].append('other')
        self.assertEqual(before, record)

    def test_negative_conflicting_and_draft_gates_are_preserved(self):
        record = self.heritage_record()
        record['preservation'].update(verified=False, verificationStatus='rejected')
        record['story_sections'][0].update(verification_status='draft', verified=False)
        record['historical_events'][0]['sourceRefs'] = ['unresolved-evidence']
        self.approve()
        exported = export_records([record], self.workflow)[0][0]
        self.assertIs(exported['preservation']['verified'], False)
        self.assertEqual(exported['preservation']['verificationStatus'], 'rejected')
        self.assertEqual(exported['story_sections'][0]['verification_status'], 'draft')
        self.assertEqual(exported['historical_events'][0]['sourceRefs'], ['unresolved-evidence'])
        self.assertNotIn('evidence', exported['historical_events'][0])

    def test_malformed_explicit_gates_fail_closed_without_leaking_nested_values(self):
        for malformed in (None, [], 'destroyed', {'state': 'destroyed', 'verified': {'internal_notes': 'private'}}):
            with self.subTest(malformed=malformed):
                record = self.heritage_record()
                record['preservation'] = malformed
                self.approve()
                exported = export_records([record], self.workflow)[0][0]
                self.assertEqual(exported['preservation'], {'state': 'unknown', 'verified': False})
        record = self.heritage_record()
        record['story_sections'][0]['verificationStatus'] = {'internal_notes': 'private'}
        record['historical_events'][0]['sourceRefs'] = ['site-evidence', {'internal_notes': 'private'}]
        self.approve()
        exported = export_records([record], self.workflow)[0][0]
        self.assertEqual(exported['story_sections'], [])
        self.assertEqual(exported['historical_events'], [])

    def test_optional_claims_require_current_record_approval(self):
        record = self.heritage_record()
        self.assertEqual(export_records([record], self.workflow)[0], [])
        self.approve()
        self.assertEqual(len(export_records([record], self.workflow)[0]), 1)
        record['historical_events'][0]['year'] = -499
        self.assertEqual(export_records([record], self.workflow)[0], [])

    def test_source_access_and_mirror_classification_survive_without_inferred_fulltext(self):
        record = self.heritage_record()
        for access in ('full-text', 'search-snippet', None, 'unrecognized'):
            with self.subTest(access=access):
                source = record['sources'][0]
                source.update(sourceType='official', sourceTypeNote='Original institution mirrored here.',
                    internal_notes={'private': True})
                if access is None:
                    source.pop('accessLevel', None)
                else:
                    source['accessLevel'] = access
                self.approve()
                output, report = export_records([record], self.workflow)
                self.assertEqual(len(output), 1, report)
                public = output[0]['sources'][0]
                self.assertEqual(public['sourceType'], 'official')
                self.assertEqual(public['sourceTypeNote'], 'Original institution mirrored here.')
                self.assertNotIn('internal_notes', public)
                if access in ('full-text', 'search-snippet'):
                    self.assertEqual(public['accessLevel'], access)
                else:
                    self.assertNotIn('accessLevel', public)


if __name__ == '__main__':
    unittest.main()
