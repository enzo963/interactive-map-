import copy
import json
import unittest

import test_logging_review_export as fixtures
from hb_pipeline.exporter import export_records


class DigitalResourceExportTests(unittest.TestCase):
    # Reuse the real saved-evidence/ledger fixture without inheriting its test cases.
    setUp = fixtures.ReviewExportTests.setUp
    add_evidence = fixtures.ReviewExportTests.add_evidence
    refresh = fixtures.ReviewExportTests.refresh
    write_input = fixtures.ReviewExportTests.write_input
    approve = fixtures.ReviewExportTests.approve
    licensed_image = fixtures.ReviewExportTests.licensed_image

    def digital_record(self):
        self.record.update(has3D=True, model_3d_url='/models/temple.glb',
            model_metadata={'id': 'temple', 'title': 'Temple survey', 'siteId': 'site-one', 'creator': 'Team',
                'creationMethod': 'Photogrammetry', 'creation_method': 'Photogrammetry', 'year': 2024,
                'sourceName': 'Archive', 'sourceUrl': 'https://whc.unesco.org/source', 'license': '',
                'format': 'GLB', 'fileSizeBytes': 2048, 'file_size_bytes': 2048,
                'verificationStatus': 'verified', 'internal_notes': 'private'},
            digital_assets=[{'type': '3d', 'id': 'model-b', 'url': '/models/other.glb',
                'verification_status': 'draft', 'verified': False, 'siteId': 'site-one', 'title': 'Other',
                'internal_notes': 'private'}],
            photogrammetry_projects=[{'id': 'survey', 'title': 'Survey', 'siteId': 'site-one',
                'verification_status': 'verified', 'verified': False, 'our_work': False, 'status': 'planned',
                'modelUrls': ['/models/temple.glb'], 'photographUrls': ['/photo.jpg'],
                'documentation': [{'title': 'Report', 'url': 'https://whc.unesco.org/report',
                    'verification_status': 'draft', 'siteId': 'site-one', 'internal_notes': 'private'}],
                'reconstruction': {'description': 'Roof interpretation', 'evidence': 'Survey',
                    'uncertainties': 'Height unknown', 'internal_notes': 'private'}, 'internal_notes': 'private'}],
            comparisons=[{'id': 'pair', 'title': 'Two views', 'type': 'historical-current', 'siteId': 'site-one',
                'verification_status': 'draft', 'verified': False,
                'before': {'image': '/before.jpg', 'label': 'Archive', 'date': None, 'kind': 'photograph', 'internal_notes': 'private'},
                'after': {'image': '/after.jpg', 'label': 'Today', 'date': '2024', 'kind': 'photograph'}, 'notes': 'Different scales', 'internal_notes': 'private'}])
        return self.record

    def test_approved_optional_records_survive_without_private_fields_or_mutation(self):
        record = self.digital_record()
        before = copy.deepcopy(record)
        self.approve()
        output, report = export_records([record], self.workflow)
        self.assertEqual(len(output), 1, report)
        exported = output[0]
        for field in ('model_metadata', 'digital_assets', 'photogrammetry_projects', 'comparisons'):
            self.assertIn(field, exported)
        self.assertEqual(exported['model_metadata']['creationMethod'], 'Photogrammetry')
        self.assertEqual(exported['model_metadata']['file_size_bytes'], 2048)
        self.assertEqual(exported['photogrammetry_projects'][0]['reconstruction']['uncertainties'], 'Height unknown')
        self.assertIsNone(exported['comparisons'][0]['before']['date'])
        self.assertNotIn('internal_notes', json.dumps(exported))
        self.assertEqual(record, before)
        exported['photogrammetry_projects'][0]['modelUrls'].append('/other.glb')
        self.assertEqual(record, before)

    def test_draft_and_explicit_false_review_flags_never_become_approval(self):
        self.digital_record()
        self.approve()
        exported = export_records([self.record], self.workflow)[0][0]
        for field in ('digital_assets', 'comparisons'):
            self.assertEqual(exported[field][0]['verification_status'], 'draft')
            self.assertIs(exported[field][0]['verified'], False)
        project = exported['photogrammetry_projects'][0]
        self.assertIs(project['our_work'], False)
        self.assertIs(project['verified'], False)
        self.assertEqual(project['status'], 'planned')
        self.assertEqual(project['documentation'][0]['verification_status'], 'draft')

    def test_unsafe_urls_never_publish_but_safe_unresolved_references_remain_references(self):
        record = self.digital_record()
        unsafe = ['javascript:bad', '//evil.example/file', '/bad\\path', '/bad path', '/bad\x7fpath', 'https://user:pass@whc.unesco.org/private']
        record['digital_assets'] += [{'type': '3d', 'url': value, 'verification_status': 'verified'} for value in unsafe]
        project = record['photogrammetry_projects'][0]
        project['modelUrls'] += unsafe
        project['photographUrls'] += unsafe
        project['documentation'] += [{'title': 'Unsafe', 'url': value, 'verification_status': 'verified'} for value in unsafe]
        record['comparisons'].append({**record['comparisons'][0], 'id': 'bad-pair', 'before': {'image': 'javascript:bad', 'label': 'Bad'}})
        record['model_metadata']['sourceUrl'] = 'javascript:bad'
        self.approve()
        exported = export_records([record], self.workflow)[0][0]
        self.assertEqual(len(exported['digital_assets']), 1)
        self.assertEqual(exported['photogrammetry_projects'][0]['modelUrls'], ['/models/temple.glb'])
        self.assertEqual(exported['photogrammetry_projects'][0]['photographUrls'], ['/photo.jpg'])
        self.assertEqual(len(exported['photogrammetry_projects'][0]['documentation']), 1)
        self.assertEqual(len(exported['comparisons']), 1)
        self.assertFalse(exported['model_metadata'].get('sourceUrl'))
        self.assertNotIn('javascript:', json.dumps(exported))

    def test_license_binding_and_negative_observations_survive_without_private_evidence_details(self):
        record = self.digital_record()
        image = self.licensed_image()
        asset = record['digital_assets'][0]
        asset.update({key: copy.deepcopy(value) for key, value in image.items() if key.startswith('license') or key == 'publication_approval'})
        asset['source_observations'] = [{'source_name': 'Rights source', 'source_url': 'https://whc.unesco.org/permission',
            'licenseStatus': 'restricted', 'license_review': {'permission': 'restricted', 'internal_notes': 'private'}, 'internal_notes': 'private'}]
        asset['license_tracking'] = {'evidence_valid': False, 'automatically_approved': False,
            'evidence_checks': [{'valid': False, 'source': {'url': 'https://whc.unesco.org/permission', 'evidenceId': 'license-evidence', 'internal_notes': 'private'}}]}
        self.approve()
        exported = export_records([record], self.workflow)[0][0]['digital_assets'][0]
        self.assertEqual(exported['license_review']['image_url'], image['src'])
        self.assertEqual(exported['license_review']['evidence'][0]['evidenceId'], 'license-evidence')
        self.assertIs(exported['license_tracking']['evidence_valid'], False)
        self.assertIs(exported['license_tracking']['evidence_checks'][0]['valid'], False)
        self.assertEqual(exported['source_observations'][0]['licenseStatus'], 'restricted')
        self.assertEqual(exported['source_observations'][0]['license_review']['permission'], 'restricted')
        self.assertNotIn('artifact', json.dumps(exported))
        self.assertNotIn('internal_notes', json.dumps(exported))

    def test_optional_records_do_not_bypass_ledger_or_changed_record_fingerprint(self):
        self.digital_record()
        self.assertEqual(export_records([self.record], self.workflow)[0], [])
        self.approve()
        other = copy.deepcopy(self.record)
        other.update(id='unapproved', name='Unapproved sibling')
        self.assertEqual(len(export_records([self.record, other], self.workflow)[0]), 1)
        self.record['model_metadata']['creator'] = 'Changed team'
        self.assertEqual(export_records([self.record], self.workflow)[0], [])

    def test_legacy_documentation_survives_explicit_approval_with_only_public_typed_fields(self):
        documentation = {'date': '2024-05', 'team': 'Survey team', 'methods': ['Photogrammetry'],
            'method': 'Survey', 'equipment': ['Camera'], 'notes': 'Coverage limited to the facade.',
            'internal_notes': 'Private planning', 'reviewer_email': 'private@example.org'}
        self.record['documentation'] = documentation
        before = copy.deepcopy(self.record)
        self.assertEqual(export_records([self.record], self.workflow)[0], [])
        self.approve()
        exported = export_records([self.record], self.workflow)[0][0]
        self.assertEqual(exported['documentation'], {key: value for key, value in documentation.items()
            if key not in ('internal_notes', 'reviewer_email')})
        self.assertEqual(self.record, before)
        self.record['documentation'] = {'date': {}, 'team': 42, 'methods': ['Survey', {'internal_notes': 'private'}],
            'equipment': 'Camera', 'notes': 'Public note'}
        self.approve()
        exported = export_records([self.record], self.workflow)[0][0]
        self.assertEqual(exported['documentation'], {'equipment': 'Camera', 'notes': 'Public note'})

    def test_sanitizing_invalid_rights_source_does_not_promote_permission(self):
        self.digital_record()
        self.record['digital_assets'][0].update(license_status='verified', sourceUrl='javascript:bad',
            source_observations=[{'licenseStatus': {'invalid': 'state'}, 'source_url': 'javascript:bad'}])
        self.approve()
        exported = export_records([self.record], self.workflow)[0][0]['digital_assets'][0]
        self.assertNotEqual(exported['license_status'], 'verified')
        self.assertEqual(exported['source_observations'][0]['licenseStatus'], 'unknown')


if __name__ == '__main__':
    unittest.main()
