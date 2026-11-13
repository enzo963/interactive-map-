import copy
import json
import unittest

import test_logging_review_export as fixtures
from hb_pipeline.exporter import export_records
from hb_pipeline.review_workflow import fingerprint


class HeritageMediaExportTests(unittest.TestCase):
    setUp = fixtures.ReviewExportTests.setUp
    add_evidence = fixtures.ReviewExportTests.add_evidence
    refresh = fixtures.ReviewExportTests.refresh
    write_input = fixtures.ReviewExportTests.write_input
    approve = fixtures.ReviewExportTests.approve
    licensed_image = fixtures.ReviewExportTests.licensed_image

    def media(self, **extra):
        return dict(id='archive', type='archival-image', title='Recorded view', description='Reviewed description',
            siteId='site-one', verification_status='verified', reviewedBy='Historian', reviewedAt='2026-11-01',
            sourceRefs=['site-evidence'], date='c. 1900–1910', year=-500, internal_notes={'private': True}, **extra)

    def test_real_rights_and_claims_survive_without_private_data_or_mutation(self):
        image = self.licensed_image()
        self.record['heritage_media'] = [{**image, **self.media()}]
        self.approve()
        before = copy.deepcopy(self.record)
        before_hash = fingerprint(self.record)
        output, report = export_records([self.record], self.workflow)
        self.assertEqual(len(output), 1, report)
        media = output[0]['heritage_media'][0]
        self.assertEqual(media['year'], -500)
        self.assertEqual(media['date'], 'c. 1900–1910')
        self.assertEqual(media['sourceRefs'], ['site-evidence'])
        self.assertTrue(media['license_tracking']['evidence_valid'])
        self.assertNotIn('internal_notes', json.dumps(output))
        self.assertNotIn('locator', json.dumps(output))
        self.assertEqual(before, self.record)
        self.assertEqual(before_hash, fingerprint(self.record))
        media['sourceRefs'].append('unrelated')
        self.assertEqual(before, self.record)

    def test_new_images_cannot_self_declare_repository_proof(self):
        image = self.licensed_image()
        image['license_review']['evidence'][0]['evidenceId'] = 'imaginary'
        image['license_tracking'] = {'evidence_valid': True, 'evidence_checks': [{'valid': True}]}
        self.record['heritage_media'] = [{**image, **self.media()}]
        self.approve()
        output, report = export_records([self.record], self.workflow)
        self.assertEqual(output[0]['heritage_media'], [])
        self.assertTrue(any(item['field'] == 'heritage_media[0]' for item in report['items'][0]['media_omissions']))

    def test_negative_flags_and_source_references_are_not_promoted(self):
        self.record['heritage_media'] = [self.media(url='https://example.org/model.glb', type_unused='private')]
        media = self.record['heritage_media'][0]
        media.update(type='3d', verified=False, verificationStatus='rejected', license_status='restricted', sourceRefs=['unresolved'])
        self.approve()
        output, report = export_records([self.record], self.workflow)
        self.assertEqual(len(output), 1, report)
        result = output[0]['heritage_media'][0]
        self.assertIs(result['verified'], False)
        self.assertEqual(result['verificationStatus'], 'rejected')
        self.assertEqual(result['license_status'], 'restricted')
        self.assertEqual(result['sourceRefs'], ['unresolved'])
        self.assertNotIn('type_unused', result)

    def test_current_ledger_approval_required_and_media_edits_invalidate_it(self):
        self.record['heritage_media'] = [dict(self.media(url='https://example.org/model.glb'), type='3d')]
        self.assertEqual(export_records([self.record], self.workflow)[0], [])
        self.approve()
        self.assertEqual(len(export_records([self.record], self.workflow)[0]), 1)
        self.record['heritage_media'][0]['date'] = '1901'
        self.assertEqual(export_records([self.record], self.workflow)[0], [])

    def test_negative_image_observation_blocks_duplicate_cover_url(self):
        image = self.licensed_image()
        self.record['coverImage'] = image
        self.record['heritage_media'] = [{**image, **self.media(), 'license_status': 'restricted'}]
        self.approve()
        output, report = export_records([self.record], self.workflow)
        self.assertEqual(len(output), 1, report)
        self.assertIsNone(output[0]['coverImage'])
        self.assertEqual(output[0]['heritage_media'], [])

    def test_malformed_optional_resource_cannot_suppress_an_approved_site(self):
        for value in (None, {}, 'not-media'):
            with self.subTest(value=value):
                self.record['heritage_media'] = value
                self.approve()
                self.assertEqual(len(export_records([self.record], self.workflow)[0]), 1)

    def test_nested_restriction_blocks_cover_and_all_same_site_occurrences_in_any_order(self):
        image = self.licensed_image()
        allowed = {**image, **self.media()}
        restricted = {**image, **self.media(), 'id': 'restricted', 'verification_status': 'draft',
            'source_observations': [{'license_status': 'restricted'}]}
        for resources in ([allowed, restricted], [restricted, allowed]):
            with self.subTest(order=[value['id'] for value in resources]):
                self.record.update(coverImage=image, heritage_media=resources)
                self.approve()
                output, report = export_records([self.record], self.workflow)
                self.assertEqual(len(output), 1, report)
                self.assertIsNone(output[0]['coverImage'])
                self.assertEqual(output[0]['heritage_media'], [])
        self.record.update(coverImage=image, heritage_media=[allowed, {**restricted, 'siteId': 'other'}])
        self.approve()
        output, report = export_records([self.record], self.workflow)
        self.assertEqual(len(output), 1, report)
        self.assertIsNotNone(output[0]['coverImage'])
        self.assertEqual([value['id'] for value in output[0]['heritage_media']], ['archive'])

    def test_numeric_historical_dates_reject_future_starts_and_conflicting_years(self):
        from datetime import date, timedelta
        today = date.today()
        future_day = (today + timedelta(days=1)).isoformat()
        next_month = date(today.year + (today.month == 12), today.month % 12 + 1, 1).isoformat()[:7]
        for historic_date, year in [(future_day, None), (next_month, None), ('1900', 1901),
            ('1900-02', 1901), ('1900-02-01', 1901), (' 1900-02 ', 1901)]:
            with self.subTest(date=historic_date, year=year):
                self.record['heritage_media'] = [{**self.media(), 'type': '3d', 'url': 'https://example.org/model.glb',
                    'date': historic_date, 'year': year}]
                self.approve()
                output, report = export_records([self.record], self.workflow)
                self.assertEqual(len(output), 1, report)
                self.assertEqual(output[0]['heritage_media'], [])
        for historic_date, year in [(str(today.year), today.year), ('1900-02', 1900), ('500 BCE', -500)]:
            self.record['heritage_media'] = [{**self.media(), 'type': '3d', 'url': 'https://example.org/model.glb',
                'date': historic_date, 'year': year}]
            self.approve()
            output, report = export_records([self.record], self.workflow)
            self.assertEqual(output[0]['heritage_media'][0]['date'], historic_date, report)


if __name__ == '__main__':
    unittest.main()
