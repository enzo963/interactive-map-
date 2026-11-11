import copy
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hb_pipeline.evidence_repository import EvidenceRepository
from hb_pipeline.image_licenses import track_license, track_record_images, license_state
from hb_pipeline.images import select_cover
from hb_pipeline.galleries import prepare_gallery
from hb_pipeline.storage import Storage
from hb_pipeline.utils import sha256_bytes
from track_image_licenses import main
from test_gallery_images import candidate, checker


class ImageLicenseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.storage = Storage(self.root/'data')
        self.url = 'https://whc.unesco.org/photo.png'
        self.phrase = 'Example photographer permits publication of the identified image under CC BY 4.0.'
        raw = f'<html><body><figure><img src="{self.url}"><figcaption>{self.phrase}</figcaption></figure></body></html>'.encode()
        self.path = self.storage.save_html('erbil','unesco','license-test',raw)
        self.manifest = self.storage.evidence_json_path('erbil','unesco','license-test')
        self.storage.save_json(self.manifest, {'evidence_id':'license-test','source_id':'unesco','trust_tier':1,
            'final_url':'https://whc.unesco.org/permissions','retrieved_at':'2026-11-01T00:00:00Z',
            'http_status':200,'robots':{'status':'allowed'},'html_path':str(self.path.relative_to(self.root)), 'sha256':sha256_bytes(raw)})
        self.repo = EvidenceRepository(self.root/'data')

    def reviewed(self):
        return {'url':self.url,'siteId':'site-erbil','license_status':'verified','license_hint':'CC BY 4.0',
            'license_review':{'permission':'publication-permitted','reviewedBy':'Fixture reviewer','reviewedAt':'2026-11-01',
                'license':'CC BY 4.0','image_url':self.url,'evidence':[{
                    'evidenceId':'license-test','source_url':'https://whc.unesco.org/permissions','image_url':self.url,
                    'locator':{'artifact':str(self.path),'selector':'figcaption','text_match':self.phrase},
                    'image_locator':{'artifact':str(self.path),'selector':'img','text_match':self.url}}]}}

    def test_unknown_and_reported_unverified_are_distinct(self):
        self.assertEqual(track_license({'url':self.url},self.repo)['license_status'],'unknown')
        self.assertEqual(track_license({'url':self.url,'license_hint':'CC BY (reported)'},self.repo)['license_status'],'unverified')

    def test_verified_requires_actual_saved_image_specific_evidence_and_manual_review(self):
        original = self.reviewed()
        result = track_license(original,self.repo)
        self.assertEqual(result['license_status'],'verified')
        self.assertTrue(result['license_tracking']['evidence_valid'])
        self.assertNotIn('publication_approval',result)
        self.assertNotIn('safe_for_publication',result)
        self.assertNotIn('license_tracking',original)

    def test_label_or_trusted_source_or_http_success_cannot_verify_license(self):
        for fields in [{'license_status':'verified'}, {'license_hint':'CC BY 4.0'},
                       {'source_id':'unesco','url_validation':[{'valid':True}]}]:
            result = track_license(dict(url=self.url,**fields),self.repo)
            self.assertNotEqual(result['license_status'],'verified')

    def test_missing_named_review_or_bad_date_or_permission_keeps_unverified(self):
        for field,value in [('reviewedBy',''),('reviewedAt','2026-02-30'),('permission','unknown'),('license','')]:
            image = self.reviewed()
            image['license_review'][field] = value
            self.assertEqual(track_license(image,self.repo)['license_status'],'unverified')

    def test_different_image_url_cannot_reuse_verified_review(self):
        image = self.reviewed()
        image['url'] = 'https://whc.unesco.org/other.png'
        self.assertEqual(track_license(image,self.repo)['license_status'],'unverified')

    def test_source_and_image_evidence_mismatches_rejected(self):
        for field,value in [('source_url','https://whc.unesco.org/other'),('image_url','https://whc.unesco.org/other.png'),('evidenceId','missing'),('image_locator',None)]:
            image = self.reviewed()
            image['license_review']['evidence'][0][field] = value
            result = track_license(image,self.repo)
            self.assertEqual(result['license_status'],'unverified')
            self.assertTrue(result['license_tracking']['issues'])

    def test_tampered_snapshot_invalidates_previous_verified_tracking(self):
        image = track_license(self.reviewed(),self.repo)
        self.path.write_text('tampered',encoding='utf-8')
        result = track_license(image,self.repo)
        self.assertEqual(result['license_status'],'unverified')
        self.assertFalse(result['license_tracking']['evidence_valid'])

    def test_restriction_is_preserved_even_when_claimed_verified(self):
        image = self.reviewed()
        image['license_review']['permission'] = 'restricted'
        self.assertEqual(track_license(image,self.repo)['license_status'],'restricted')
        self.assertEqual(track_license({'url':self.url,'license_status':'restricted'},self.repo)['license_status'],'restricted')

    def test_invalid_status_and_stale_safe_flag_retained_only_as_audit_claims(self):
        for status in ['safe',{},123]:
            result = track_license({'url':self.url,'license_status':status,'safe_for_publication':True},self.repo)
            self.assertEqual(result['license_status'],'unknown')
            self.assertTrue(result['license_tracking']['issues'])
            self.assertNotIn('safe_for_publication',result)
            self.assertTrue(result['license_tracking']['reported_publication_flags']['safe_for_publication'])

    def test_recursion_tracks_cover_gallery_candidates_and_observations_without_mutating(self):
        record = {'id':'site-erbil','coverImage':{'src':self.url,'alt':'View'},
                  'galleryImages':[{'src':self.url,'alt':'View','source_observations':[{'url':self.url,'alt':'View','license_hint':'Reported terms'}]}],
                  'image_candidates':[{'url':self.url,'alt':'View','license_status':'restricted'}],
                  'sources':[{'url':'https://whc.unesco.org/reference','sourceName':'UNESCO'}]}
        original = copy.deepcopy(record)
        result,counts = track_record_images(record,self.repo)
        self.assertEqual(sum(counts.values()),4)
        self.assertEqual(counts['restricted'],1)
        self.assertEqual(counts['unknown'],2)
        self.assertNotIn('license_status',result['sources'][0])
        self.assertEqual(record,original)

    def test_restricted_candidate_cannot_be_cover_or_gallery_and_is_not_requested(self):
        image = candidate(license_status='restricted',width=1200,height=800)
        v,session,_ = checker([])
        self.assertIsNone(select_cover([image],'site-erbil',v.registry)['proposed_coverImage'])
        record = {'id':'site-erbil','name':'Erbil Citadel','source_evidence':['evidence-1'],'image_candidates':[image]}
        self.assertEqual(prepare_gallery(record,v)['galleryImages'],[])
        session.get.assert_not_called()

    def test_restricted_duplicate_cannot_be_hidden_by_another_observation(self):
        v,session,_ = checker([])
        record = {'id':'site-erbil','name':'Erbil Citadel','source_evidence':['evidence-1'],
                  'image_candidates':[candidate(),candidate(license_status='restricted')]}
        self.assertEqual(prepare_gallery(record,v)['galleryImages'],[])
        self.assertIsNone(select_cover(record['image_candidates'],'site-erbil',v.registry)['proposed_coverImage'])
        session.get.assert_not_called()

    def test_existing_approval_is_not_created_or_changed_by_license_audit(self):
        image = self.reviewed()
        image['publication_approval'] = {'status':'pending'}
        result = track_license(image,self.repo)
        self.assertEqual(result['publication_approval'],{'status':'pending'})
        self.assertFalse(result['license_tracking']['automatically_approved'])

    def test_audit_cli_is_separate_and_cannot_overwrite_inputs(self):
        path,out = self.root/'site.json',self.root/'audit.json'
        self.storage.save_json(path,{'id':'site','coverImage':{'src':self.url,'alt':'View'}})
        before = path.read_bytes()
        with patch('track_image_licenses.BASE',self.root),contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main([str(path),'--output',str(out)]),2)
            self.assertEqual(main([str(path),'--output',str(path)]),1)
        self.assertTrue(out.exists())
        self.assertEqual(path.read_bytes(),before)


if __name__ == '__main__':
    unittest.main()
