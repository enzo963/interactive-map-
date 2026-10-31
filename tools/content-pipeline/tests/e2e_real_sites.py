"""Selected real-site flow in isolated storage; test decisions never approve project data."""
import argparse
import contextlib
import io
import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from hb_pipeline.config import SourceRegistry
from hb_pipeline.evidence_repository import EvidenceRepository,read_json
from hb_pipeline.exporter import export_records
from hb_pipeline.fetcher import TrustedFetcher,FetchResult
from hb_pipeline.galleries import prepare_gallery
from hb_pipeline.http import RequestPolicy
from hb_pipeline.image_validation import ImageURLValidator
from hb_pipeline.images import ImageIdentityIndex
from hb_pipeline.logging import PipelineLogger
from hb_pipeline.models import RobotsDecision
from hb_pipeline.review_workflow import ReviewWorkflow
from hb_pipeline.storage import Storage
from main import fetch_page
from prepare_images import prepare

BASE=Path(__file__).resolve().parents[1]
SELECTED=[('site-erbil-erbil-citadel','Erbil Citadel','Erbil','https://whc.unesco.org/en/list/1437/'),('site-001','Hatra','Nineveh','https://whc.unesco.org/en/list/277/')]


class ReplayFetcher:
    def __init__(self,repository): self.repository=repository; self.last_attempts=[]
    def fetch(self,url,source):
        candidates=self.repository.related(source.id,[url])
        ref=max(candidates,key=lambda item:item[1]['retrieved_at'])[0]
        manifest,_,raw,_,_=self.repository.snapshot(ref)
        return FetchResult(url,manifest['final_url'],200,'text/html',raw,RobotsDecision(**manifest['robots']))
    def close(self): pass


def positive_fixture():
    from test_logging_review_export import ReviewExportTests
    case=ReviewExportTests('test_only_explicitly_approved_image_with_saved_license_evidence_exports')
    case.setUp()
    try:
        image=case.licensed_image()
        case.record.update(name='Synthetic image approval fixture',coverImage=image,galleryImages=[image])
        case.approve()
        exported,_=export_records([case.record],case.workflow)
        return exported[0]
    finally: case.doCleanups()


def run(output_dir,mode):
    started=time.perf_counter()
    root=output_dir/('run-'+uuid.uuid4().hex[:10]); root.mkdir(parents=True)
    # A separate Storage root is essential: no real editorial decisions are made.
    storage=Storage(root/'data'); registry=SourceRegistry()
    client=TrustedFetcher(timeout_seconds=12,policy=RequestPolicy(max_attempts=2)) if mode=='live' else ReplayFetcher(EvidenceRepository(BASE/'data'))
    failures=[]; captured=[]
    try:
        for rid,name,gov,url in SELECTED:
            stage=time.perf_counter()
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    fetch_page(registry,storage,'unesco',gov,url,{'id':rid,'name':name},fetcher=client)
                captured.append({'id':rid,'name':name,'governorate':gov,'url':url,'fetch_seconds':round(time.perf_counter()-stage,4)})
                print(f'{name}: fetched/extracted in {time.perf_counter()-stage:.2f}s',flush=True)
            except Exception as exc:
                failures.append({'id':rid,'stage':'fetch','error':str(exc)})
    finally: client.close()
    repo=EvidenceRepository(storage.base_dir)
    records=[]
    for item in captured:
        matches=[(ref,manifest) for ref,rows in repo.index.items() for _,manifest in rows if manifest['requested_url']==item['url']]
        ref,manifest=matches[0]
        draft=read_json(storage.draft_json_path(item['governorate'],'draft-'+ref))
        if item['name'].casefold() not in draft['candidate_name'].casefold():
            failures.append({'id':item['id'],'stage':'extract','error':'Page title does not identify selected real site.'})
        records.append({'id':item['id'],'name':item['name'],'slug':item['name'].lower().replace(' ','-'),'governorate':item['governorate'],
            'category':'Citadel' if 'Citadel' in item['name'] else 'Archaeological Site','period':'','description':draft['candidate_summary'],
            'unesco':True,'has3D':None,'coverImage':None,'galleryImages':[],'source_evidence':[ref],
            'sources':[{'sourceName':manifest['source_name'],'url':manifest['final_url'],'evidenceId':ref,'accessedAt':manifest['retrieved_at']}],
            'status':'needs-review','is_test_fixture':True})
        item.update(evidence_id=ref,sha256=manifest['sha256'],extracted_title=draft['candidate_name'])
    validator=ImageURLValidator(registry=registry,policy=RequestPolicy(max_attempts=2),logger=PipelineLogger(storage))
    prepared=[]
    try:
        identities=ImageIdentityIndex(records)
        for record,item in zip(records,captured):
            with_images=prepare(record,record['source_evidence'],repo,identities)
            with_gallery=prepare_gallery(with_images,validator,identities)
            item.update(image_candidates=len(with_images['image_candidates']),gallery_images_before_export=len(with_gallery['galleryImages']),
                url_checks=with_gallery['gallery_review']['network_checks'],cover_selection=with_images['cover_selection']['status'])
            if not with_images['image_candidates']:
                failures.append({'id':record['id'],'stage':'images','error':'No image candidate discovered from real source.'})
            prepared.append(with_gallery)
    finally: validator.close()
    inputs=root/'review-input.json'; storage.save_json(inputs,prepared)
    workflow=ReviewWorkflow(storage,repo)
    for record in prepared:
        workflow.decide(record,'approved','ISOLATED INTEGRATION TEST',
            'TEST TRANSITION ONLY: verifies workflow wiring, not editorial approval or image reuse rights. Real ledger is untouched.',inputs)
    exported,export_report=export_records(prepared,workflow)
    if len(exported)!=len(prepared): failures.append({'stage':'export','error':'Isolated test approvals failed to export.'})
    for record in exported:
        if record['coverImage'] or record['galleryImages']:
            failures.append({'id':record['id'],'stage':'license-gate','error':'Unverified real image crossed export gate.'})
    # Positive image UI path uses a wholly synthetic permission fixture, not fabricated rights for a real photo.
    exported.append(positive_fixture())
    storage.save_json(root/'approved-test-export.json',exported)
    storage.save_json(root/'export-report.json',export_report)
    result={'test_only':True,'mode':mode,'source_sites':captured,'failures':failures,
        'real_sites_exported_in_isolated_test':len(exported)-1,'synthetic_image_fixture_records':1,
        'real_image_rights_approved':0,'project_editorial_decisions_changed':False,'published':False,
        'export_path':str((root/'approved-test-export.json').resolve()),'isolated_data_root':str(storage.base_dir.resolve()),
        'total_seconds':round(time.perf_counter()-started,4)}
    output_dir.mkdir(parents=True,exist_ok=True)
    (output_dir/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode',choices=['live','replay'],default='replay')
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args()
    target=args.output_dir.resolve()
    if target.is_relative_to((BASE/'data').resolve()) and not target.is_relative_to((BASE/'data/testing').resolve()) or target.is_relative_to((BASE.parents[1]/'src').resolve()):
        parser.error('Use separate scratch storage or data/testing, never real source/review/frontend data.')
    result=run(target,args.mode)
    return 1 if result['failures'] else 0


if __name__=='__main__': raise SystemExit(main())
