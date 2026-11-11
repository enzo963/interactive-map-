"""Regressions for scalability fixes: caches cannot weaken matching or integrity."""
import copy
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hb_pipeline.storage import Storage
from hb_pipeline.errors import StorageError
from hb_pipeline.evidence_repository import EvidenceRepository
from hb_pipeline.images import ImageIdentityIndex,_association
from hb_pipeline.review_workflow import source_state


class ScaleRegressionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.storage=Storage(self.root/'data')

    def manifest(self,ref='a',url='https://whc.unesco.org/site',digest='a'*64,date='2026-11-01T00:00:00Z'):
        payload={'evidence_id':ref,'source_id':'unesco','requested_url':url,'final_url':url,'sha256':digest,'retrieved_at':date}
        path=self.storage.evidence_json_path('erbil','unesco',ref)
        self.storage.save_json(path,payload)
        return path

    def find(self,url='https://whc.unesco.org/site',digest='a'*64):
        return self.storage.find_evidence('erbil','unesco',[url],digest)

    def test_unchanged_manifests_are_not_reparsed_on_every_lookup(self):
        self.manifest()
        self.find()
        with patch('hb_pipeline.evidence_repository.read_json',side_effect=AssertionError('unnecessary parse')):
            self.assertEqual(self.find()[1]['evidence_id'],'a')

    def test_atomic_replacement_and_in_place_corruption_invalidate_metadata_cache(self):
        path=self.manifest()
        self.find()
        self.manifest(digest='b'*64,date='2026-11-01T01:00:00Z')
        self.assertEqual(self.find()[1]['sha256'],'b'*64)
        path.write_text('broken JSON',encoding='utf-8')
        with self.assertRaises(StorageError): self.find()

    def test_new_and_deleted_manifests_update_cached_latest_revision(self):
        old=self.manifest()
        self.find()
        new=self.manifest('b',digest='b'*64,date='2026-11-01T01:00:00Z')
        self.assertEqual(self.find()[1]['evidence_id'],'b')
        new.unlink()
        self.assertEqual(self.find()[1]['evidence_id'],'a')
        old.unlink()
        self.assertIsNone(self.find())

    def test_returned_payload_mutation_cannot_corrupt_cache(self):
        self.manifest()
        _,payload=self.find()
        payload['sha256']='forged'
        self.assertEqual(self.find()[1]['sha256'],'a'*64)

    def test_url_index_preserves_normalized_aliases_and_separates_query_values(self):
        self.manifest(url='https://whc.unesco.org/site?record=1')
        self.manifest('b',url='https://whc.unesco.org/site?record=2',digest='b'*64)
        repo=EvidenceRepository(self.storage.base_dir)
        self.assertEqual([ref for ref,_ in repo.related('unesco',['HTTPS://WHC.UNESCO.ORG:443/site?record=1#view'])],['a'])
        self.assertEqual([ref for ref,_ in repo.related('unesco',['https://whc.unesco.org/site?record=2'])],['b'])
        self.assertEqual(repo.related('krg',['https://whc.unesco.org/site?record=1']),[])

    def test_prepared_identity_index_matches_legacy_list_for_alias_and_ambiguity(self):
        target={'id':'erbil','name':'Erbil Citadel','alternativeNames':['Citadel of Erbil']}
        other={'id':'choli','name':'Choli Minaret'}
        catalog=[target,other]
        prepared=ImageIdentityIndex(catalog)
        for text in ['Erbil Citadel','Citadel of Erbil','Erbil Citadel and Choli Minaret','Erbil','Erbil Citadels','Choli Minaret']:
            context=[{'alt':text,'caption':'','title':'','filename':'photo.jpg'}]
            self.assertEqual(_association(context,target,catalog),_association(context,target,prepared),text)

    def test_stress_runner_rejects_production_output_before_generating_fixtures(self):
        import stress_pipeline
        forbidden=Path(__file__).resolve().parents[3]/'src/data/sites.json'
        with patch('sys.argv',['stress_pipeline.py','--output',str(forbidden)]), patch('stress_pipeline.run',side_effect=AssertionError('must not run')), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as caught:
                stress_pipeline.main()
        self.assertEqual(caught.exception.code,2)

    def test_prepared_identity_index_always_recognizes_target_not_in_catalog(self):
        target={'id':'target','name':'Distinct Heritage Site'}
        result=_association([{'alt':'Distinct Heritage Site'}],target,ImageIdentityIndex([]))
        self.assertEqual(result[0],'target')
        self.assertEqual(result[1],'matched-unverified')


if __name__=='__main__': unittest.main()
