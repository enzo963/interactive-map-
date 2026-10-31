import copy
import contextlib
import io
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from hb_pipeline.config import SourceRegistry
from hb_pipeline.evidence_repository import EvidenceRepository, read_json
from hb_pipeline.exporter import export_records
from hb_pipeline.logging import PipelineLogger
from hb_pipeline.review_workflow import ReviewWorkflow, fingerprint, records_from, unique_record
from hb_pipeline.storage import Storage
from hb_pipeline.utils import sha256_bytes
from hb_pipeline.errors import StorageError
from main import fetch_page
from hb_pipeline.fetcher import FetchResult
from hb_pipeline.models import RobotsDecision
from review_drafts import main as review_main
from export_approved import main as export_main
from test_validation import HTML


class ChangeLoggingTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.storage=Storage(self.root/'data')
        self.registry=SourceRegistry()
        self.result=FetchResult('https://whc.unesco.org/a','https://whc.unesco.org/a',200,'text/html',HTML,RobotsDecision('allowed','robots','url','test'))

    def ingest(self):
        with patch('main.TrustedFetcher') as client, contextlib.redirect_stdout(io.StringIO()):
            client.return_value.fetch.return_value=self.result
            return fetch_page(self.registry,self.storage,'unesco','erbil',self.result.requested_url)

    def events(self):
        return [read_json(path) for path in sorted((self.storage.logs_dir/'pipeline').rglob('*.json'))]

    def test_structured_log_has_required_fields_and_distinct_atomic_events(self):
        logger=PipelineLogger(self.storage)
        for _ in range(3):
            logger.log('fixture','success',source='unesco',url='https://whc.unesco.org/a',governorate='erbil',evidence_id='evidence-a')
        events=self.events()
        self.assertEqual(len(events),3)
        self.assertEqual(len({event['event_id'] for event in events}),3)
        for event in events:
            self.assertTrue(set(['timestamp','source','url','governorate','operation','result','errors','evidence_id']) <= set(event))
            self.assertIsNotNone(datetime.fromisoformat(event['timestamp']).tzinfo)
            self.assertEqual(event['errors'],[])

    def test_unchanged_content_does_not_create_new_evidence_or_draft_and_is_logged(self):
        self.ingest()
        self.ingest()
        self.assertEqual(len(list(self.storage.drafts_dir.rglob('*.json'))),1)
        self.assertTrue(any(event['operation']=='fetch' and event['result']=='unchanged' and event['evidence_id'] for event in self.events()))

    def test_content_reversion_is_change_against_latest_url_not_old_matching_digest(self):
        self.ingest()
        old=HTML
        self.result.body=HTML.replace(b'surviving architecture',b'new archaeological remains')
        self.ingest()
        self.result.body=old
        self.ingest()
        manifests=[read_json(path) for path in self.storage.raw_dir.rglob('*.evidence.json')]
        self.assertEqual(len(manifests),3)
        self.assertEqual(len(list(self.storage.drafts_dir.rglob('*.json'))),3)
        latest=max(manifests,key=lambda item:item['retrieved_at'])
        self.assertEqual(latest['change_type'],'changed')
        self.assertNotEqual(latest['sha256'],latest['previous_sha256'])
        self.assertTrue(latest['previous_evidence_id'])
        self.assertEqual(sum(event['operation']=='source.compare' and event['result']=='changed' for event in self.events()),2)

    def test_changed_invalid_html_records_hash_change_and_failure_without_new_draft(self):
        self.ingest()
        self.result.body=b'<title>Access denied</title>'
        with self.assertRaises(Exception):
            self.ingest()
        self.assertEqual(len(list(self.storage.drafts_dir.rglob('*.json'))),1)
        events=self.events()
        self.assertTrue(any(event['operation']=='source.compare' and event['result']=='changed' for event in events))
        failure=next(event for event in reversed(events) if event['result']=='failed')
        self.assertTrue(failure['errors'])
        self.assertEqual(failure['source'],'unesco')
        self.assertEqual(failure['details']['new_sha256'],sha256_bytes(self.result.body))

    def test_ambiguous_legacy_revision_dates_are_flagged_instead_of_guessing(self):
        self.ingest()
        self.result.body=HTML.replace(b'surviving architecture',b'changed historic structures')
        self.ingest()
        paths=list(self.storage.raw_dir.rglob('*.evidence.json'))
        for path in paths:
            record=read_json(path)
            record['retrieved_at']='2026-11-01T00:00:00Z'
            self.storage.save_json(path,record)
        with self.assertRaises(StorageError):
            self.storage.find_evidence('erbil','unesco',['https://whc.unesco.org/a'],sha256_bytes(self.result.body))

    def test_latest_url_revision_takes_precedence_over_other_url_content_match(self):
        self.ingest()
        self.result.requested_url=self.result.final_url='https://whc.unesco.org/b'
        self.result.body=HTML.replace(b'surviving architecture',b'other historic structures')
        self.ingest()
        self.result.requested_url=self.result.final_url='https://whc.unesco.org/a'
        self.ingest()
        self.assertEqual(len(list(self.storage.drafts_dir.rglob('*.json'))),3)


class ReviewExportTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.storage=Storage(self.root/'data')
        self.captured='2026-11-01T00:00:00Z'
        self.add_evidence('site-evidence','https://whc.unesco.org/site','<p>Site evidence with heritage facts.</p>')
        self.record={'id':'site-one','name':'Fixture Heritage Site','governorate':'Erbil','category':'Citadel','period':'',
            'description':'A complete fixture description that documents a heritage site for workflow testing.',
            'unesco':None,'has3D':None,'coverImage':None,'galleryImages':[],
            'sources':[{'sourceName':'UNESCO','url':'https://whc.unesco.org/site','evidenceId':'site-evidence','accessedAt':self.captured}],
            'source_evidence':['site-evidence'],'status':'needs-review','image_candidates':[{'url':'https://whc.unesco.org/image.jpg','license_status':'unknown'}]}
        self.input=self.root/'sites.json'
        self.write_input([self.record])
        self.refresh()

    def add_evidence(self,ref,url,body,date=None):
        raw=('<html><body>'+body+'</body></html>').encode()
        path=self.storage.save_html('erbil','unesco',ref,raw)
        self.storage.save_json(self.storage.evidence_json_path('erbil','unesco',ref),{'evidence_id':ref,'source_id':'unesco','source_name':'UNESCO',
            'trust_tier':1,'requested_url':url,'final_url':url,'retrieved_at':date or self.captured,'http_status':200,'robots':{'status':'allowed'},
            'html_path':str(path.relative_to(self.root)),'sha256':sha256_bytes(raw)})
        return path

    def refresh(self):
        self.repo=EvidenceRepository(self.storage.base_dir)
        self.workflow=ReviewWorkflow(self.storage,self.repo)

    def write_input(self,records):
        self.storage.save_json(self.input,records)

    def approve(self,record=None):
        return self.workflow.decide(record or self.record,'approved','Fixture reviewer','Reviewed canonical values and recorded warnings.',self.input)

    def licensed_image(self):
        url='https://whc.unesco.org/image.jpg'
        phrase='The identified fixture image is permitted for publication under fixture permission.'
        path=self.add_evidence('license-evidence','https://whc.unesco.org/permission',f'<figure><img src="{url}"><figcaption>{phrase}</figcaption></figure>')
        self.refresh()
        return {'src':url,'alt':'Fixture heritage view','caption':'View of walls','credit':'Fixture author','license':'Fixture permission','siteId':'site-one',
            'license_status':'verified','license_review':{'permission':'publication-permitted','reviewedBy':'Rights reviewer','reviewedAt':'2026-11-01',
                'license':'Fixture permission','image_url':url,'evidence':[{'evidenceId':'license-evidence','source_url':'https://whc.unesco.org/permission','image_url':url,
                    'locator':{'artifact':str(path),'selector':'figcaption','text_match':phrase},
                    'image_locator':{'artifact':str(path),'selector':'img','text_match':url}}]},
            'publication_approval':{'status':'approved','siteId':'site-one','site_verified':True,'image_url':url,'reviewedBy':'Fixture editor','reviewedAt':'2026-11-01'}}

    def test_raw_approved_or_rejected_status_cannot_bypass_human_ledger(self):
        for status in ['approved','rejected','needs-review']:
            record=dict(self.record,status=status)
            data,report=export_records([record],self.workflow)
            self.assertEqual(data,[])
            self.assertEqual(report['items'][0]['status'],'needs-review')

    def test_explicit_approval_changes_effective_status_without_mutating_source_record(self):
        before=self.input.read_bytes()
        decision=self.approve()
        self.assertEqual(self.workflow.effective_status(self.record)[0],'approved')
        self.assertEqual(decision['status'],'approved')
        self.assertFalse(decision['published'])
        self.assertEqual(self.input.read_bytes(),before)
        self.assertEqual(self.record['status'],'needs-review')
        self.assertEqual(self.workflow.list_records([self.record]),[])

    def test_reject_then_reapprove_keeps_history_and_never_exports_rejected(self):
        self.approve()
        self.workflow.decide(self.record,'rejected','Fixture reviewer','Rejected after review.',self.input)
        self.assertEqual(export_records([self.record],self.workflow)[0],[])
        self.approve()
        ledger=self.workflow.load()
        self.assertEqual([event['status'] for event in ledger['history']],['approved','rejected','approved'])
        self.assertEqual(len(export_records([self.record],self.workflow)[0]),1)

    def test_invalid_record_cannot_be_approved_but_can_be_rejected(self):
        invalid=dict(self.record,sources=[])
        with self.assertRaises(ValueError):
            self.approve(invalid)
        self.workflow.decide(invalid,'rejected','Reviewer','Missing sources.',self.input)
        self.assertEqual(self.workflow.effective_status(invalid)[0],'rejected')

    def test_reviewer_note_and_real_evidence_are_required_for_approval(self):
        for reviewer,note in [('', 'note'),('Reviewer','')]:
            with self.assertRaises(ValueError):
                self.workflow.decide(self.record,'approved',reviewer,note,self.input)
        invalid=copy.deepcopy(self.record)
        invalid['sources'][0]['evidenceId']=None
        with self.assertRaises(ValueError):
            self.approve(invalid)

    def test_record_edit_invalidates_approval_and_does_not_export(self):
        self.approve()
        changed=dict(self.record,description=self.record['description']+' Updated text.')
        self.assertEqual(self.workflow.effective_status(changed)[0],'needs-review')
        self.assertEqual(export_records([changed],self.workflow)[0],[])

    def test_new_source_capture_invalidates_approval_even_when_record_is_unchanged(self):
        self.approve()
        self.add_evidence('new-evidence','https://whc.unesco.org/site','<p>Changed source facts.</p>','2026-11-02T00:00:00Z')
        self.refresh()
        self.assertEqual(self.workflow.effective_status(self.record)[0],'needs-review')
        self.assertEqual(export_records([self.record],self.workflow)[0],[])

    def test_tampered_raw_evidence_invalidates_approval_and_fails_closed(self):
        self.approve()
        next(self.storage.raw_dir.rglob('site-evidence.html')).write_text('tampered',encoding='utf-8')
        self.assertEqual(self.workflow.effective_status(self.record)[0],'needs-review')
        self.assertEqual(export_records([self.record],self.workflow)[0],[])

    def test_source_citation_cannot_impersonate_another_saved_url(self):
        record=copy.deepcopy(self.record)
        record['sources'][0]['url']='https://whc.unesco.org/different-site'
        with self.assertRaises(ValueError):
            self.approve(record)

    def test_clean_export_omits_research_fields_and_unapproved_siblings(self):
        self.approve()
        other=dict(self.record,id='site-two',name='Other fixture')
        data,report=export_records([self.record,other],self.workflow)
        self.assertEqual(len(data),1)
        self.assertEqual(data[0]['id'],'site-one')
        self.assertEqual(data[0]['status'],'approved')
        for key in ['image_candidates','source_evidence','record_snapshot','candidate_name','reliability_review']:
            self.assertNotIn(key,data[0])
        self.assertEqual(data[0]['sources'],self.record['sources'])
        self.assertEqual(report['automatically_approved'],0)
        self.assertFalse(report['published'])

    def test_site_approval_does_not_approve_unlicensed_images(self):
        record=copy.deepcopy(self.record)
        record['coverImage']={'src':'https://whc.unesco.org/image.jpg','alt':'Image','caption':'','credit':'Author','license':'Unconfirmed terms','license_status':'unverified'}
        record['galleryImages']=[dict(record['coverImage'],license_status='restricted')]
        self.approve(record)
        data,report=export_records([record],self.workflow)
        self.assertIsNone(data[0]['coverImage'])
        self.assertEqual(data[0]['galleryImages'],[])
        self.assertEqual(len(report['items'][0]['media_omissions']),2)

    def test_unapproved_local_image_is_omitted_without_losing_approved_site_text(self):
        self.record['coverImage']={'src':'/local.jpg','alt':'Local view','caption':'','credit':'Author','license':'','license_status':'unknown'}
        self.approve()
        data,report=export_records([self.record],self.workflow)
        self.assertEqual(len(data),1)
        self.assertIsNone(data[0]['coverImage'])
        self.assertTrue(report['items'][0]['media_omissions'])

    def test_only_explicitly_approved_image_with_saved_license_evidence_exports(self):
        image=self.licensed_image()
        self.record['coverImage']=image
        self.record['galleryImages']=[image,copy.deepcopy(image)]
        self.approve()
        data,report=export_records([self.record],self.workflow)
        self.assertEqual(data[0]['coverImage']['license_status'],'verified')
        self.assertEqual(len(data[0]['galleryImages']),1)
        self.assertEqual(report['items'][0]['media_omissions'],[])
        evidence=data[0]['coverImage']['license_review']['evidence'][0]
        self.assertNotIn('locator',evidence)
        self.assertNotIn('artifact',json.dumps(data[0]))
        image['url_validation']=[{'valid':False,'status':'http-error'}]
        self.approve()
        data,report=export_records([self.record],self.workflow)
        self.assertIsNone(data[0]['coverImage'])
        self.assertEqual(data[0]['galleryImages'],[])
        self.assertTrue(report['items'][0]['media_omissions'])

    def test_license_verification_does_not_replace_separate_image_publication_approval(self):
        image=self.licensed_image()
        del image['publication_approval']
        self.record['coverImage']=image
        self.approve()
        data,report=export_records([self.record],self.workflow)
        self.assertIsNone(data[0]['coverImage'])
        self.assertTrue(report['items'][0]['media_omissions'])

    def test_duplicate_ids_and_duplicate_slugs_do_not_export_ambiguous_records(self):
        self.approve()
        self.assertEqual(export_records([self.record,copy.deepcopy(self.record)],self.workflow)[0],[])
        other=dict(self.record,id='site-two')
        self.approve(other)
        self.assertEqual(export_records([self.record,other],self.workflow)[0],[])
        with self.assertRaises(ValueError):
            unique_record([self.record,self.record],'site-one')

    def test_incomplete_ledger_approval_is_not_trusted(self):
        self.storage.save_json(self.workflow.path,{'version':1,'decisions':{'site-one':{'status':'approved','record_hash':fingerprint(self.record)}},'history':[]})
        self.assertEqual(export_records([self.record],self.workflow)[0],[])
        ledger=self.workflow.load()
        ledger['decisions']['site-one']['status']={"malformed":True}
        self.storage.save_json(self.workflow.path,ledger)
        self.assertEqual(export_records([self.record],self.workflow)[0],[])

    def test_concurrent_decision_lock_does_not_overwrite_another_reviewer(self):
        self.workflow.path.parent.mkdir(parents=True,exist_ok=True)
        lock=self.workflow.path.with_name(self.workflow.path.name+'.lock')
        lock.write_text('other reviewer',encoding='utf-8')
        with self.assertRaises(StorageError):
            self.approve()
        self.assertFalse(self.workflow.path.exists())
        self.assertEqual(lock.read_text(),'other reviewer')

    def test_approved_optional_model_and_location_metadata_survive_export(self):
        self.record.update(model_3d_url='https://whc.unesco.org/model.glb',latitude=36.1,longitude=44.0,slug='fixture-heritage')
        self.approve()
        data,_=export_records([self.record],self.workflow)
        self.assertEqual(data[0]['model_3d_url'],self.record['model_3d_url'])
        self.assertEqual(data[0]['latitude'],36.1)
        self.assertEqual(data[0]['slug'],'fixture-heritage')

    def test_corrupt_ledger_cannot_be_silently_overwritten(self):
        self.workflow.path.parent.mkdir(parents=True,exist_ok=True)
        self.workflow.path.write_text('broken',encoding='utf-8')
        with self.assertRaises(ValueError):
            self.approve()
        self.assertEqual(self.workflow.path.read_text(),'broken')

    def test_workflow_accepts_license_audit_wrapper(self):
        self.storage.save_json(self.input,{'records':{'sites':[self.record]}})
        self.assertEqual(records_from(self.input),[self.record])

    def test_commands_list_decide_and_export_without_writing_frontend_or_input(self):
        before=self.input.read_bytes()
        output=self.root/'export.json'
        with patch('review_drafts.BASE',self.root),patch('export_approved.BASE',self.root),contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(review_main(['list','--input',str(self.input)]),0)
            self.assertEqual(export_main(['--input',str(self.input),'--output',str(output)]),0)
            self.assertEqual(read_json(output),[])
            self.assertEqual(review_main(['approve','site-one','--input',str(self.input),'--reviewer','Fixture reviewer','--note','Reviewed.']),0)
            self.assertEqual(export_main(['--input',str(self.input),'--output',str(output)]),0)
            self.assertEqual(len(read_json(output)),1)
            self.assertEqual(review_main(['reject','site-one','--input',str(self.input),'--reviewer','Fixture reviewer','--note','Rejected.']),0)
            self.assertEqual(export_main(['--input',str(self.input),'--output',str(output)]),0)
            self.assertEqual(read_json(output),[])
        self.assertEqual(self.input.read_bytes(),before)

    def test_output_paths_cannot_overwrite_inputs_ledger_raw_or_frontend(self):
        with patch('export_approved.BASE',self.root),contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
            for target in [self.input,self.workflow.path,self.storage.raw_dir/'test.json',self.root.parents[1]/'src/test.json']:
                self.assertEqual(export_main(['--input',str(self.input),'--output',str(target)]),1)
        bad_workflow=ReviewWorkflow(self.storage,self.repo,self.input)
        with self.assertRaises(ValueError):
            bad_workflow.decide(self.record,'rejected','Reviewer','Reject.',self.input)


if __name__=='__main__':
    unittest.main()
