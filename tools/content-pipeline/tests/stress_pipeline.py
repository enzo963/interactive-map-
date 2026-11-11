"""Manual, isolated synthetic stress test. Never touches real drafts or approvals."""
import argparse
import contextlib
import io
import json
import random
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PIL import Image
from hb_pipeline.config import SourceRegistry
from hb_pipeline.duplicates import detect_possible_duplicates
from hb_pipeline.evidence_repository import EvidenceRepository, read_json
from hb_pipeline.errors import FetchError
from hb_pipeline.exporter import export_records
from hb_pipeline.fetcher import FetchResult
from hb_pipeline.galleries import prepare_gallery
from hb_pipeline.http import RequestPolicy
from hb_pipeline.images import ImageIdentityIndex
from hb_pipeline.image_validation import ImageURLValidator
from hb_pipeline.logging import PipelineLogger
from hb_pipeline.models import RobotsDecision
from hb_pipeline.review_workflow import ReviewWorkflow
from hb_pipeline.site_validation import validate_site_record
from hb_pipeline.storage import Storage
from main import run_batch

GOVERNORATES=['Erbil','Duhok','Nineveh','Kirkuk','Sulaymaniyah']


def peak_memory_mb():
    try:
        import ctypes
        from ctypes import wintypes
        class Counters(ctypes.Structure):
            _fields_=[('cb',wintypes.DWORD),('PageFaultCount',wintypes.DWORD)]+[(name,ctypes.c_size_t) for name in ['PeakWorkingSetSize','WorkingSetSize','QuotaPeakPagedPoolUsage','QuotaPagedPoolUsage','QuotaPeakNonPagedPoolUsage','QuotaNonPagedPoolUsage','PagefileUsage','PeakPagefileUsage']]
        value=Counters(); value.cb=ctypes.sizeof(value)
        handle=ctypes.windll.kernel32.GetCurrentProcess
        handle.restype=wintypes.HANDLE
        query=ctypes.windll.psapi.GetProcessMemoryInfo
        query.argtypes=[wintypes.HANDLE,ctypes.POINTER(Counters),wintypes.DWORD]
        query.restype=wintypes.BOOL
        if query(handle(),ctypes.byref(value),value.cb):
            return round(value.PeakWorkingSetSize/1024**2,2)
    except (ImportError,AttributeError,OSError,TypeError,ValueError):
        pass
    return None


class Reply:
    def __init__(self,body,status=200,mime='image/png'):
        self.body,self.status_code=body,status
        self.headers={'Content-Type':mime}
    def iter_content(self,chunk_size):
        for offset in range(0,len(self.body),chunk_size): yield self.body[offset:offset+chunk_size]
    def close(self): pass


class ImageSession:
    def __init__(self,body): self.headers={}; self.body=body; self.calls=0
    def get(self,url,**kwargs):
        self.calls+=1
        ordinal=int(url.rsplit('/',1)[-1].split('.')[0])
        if ordinal%100==2: return Reply(b'',404)
        if ordinal%100==6: return Reply(b'<html>fixture non-image</html>')
        return Reply(self.body)


class AllowedRobots:
    def check(self,url): return RobotsDecision('allowed','synthetic robots',url,'stress-fixture')


class FixtureFetcher:
    def __init__(self,names): self.names=names; self.last_attempts=[]; self.durations=[]
    def fetch(self,url,source):
        ordinal=int(url.rsplit('/',1)[-1]); name=self.names[ordinal]
        if ordinal%100==0: raise FetchError('Injected timeout fixture',code='timeout',retryable=True)
        body=b'<h1>Access denied</h1>' if ordinal%100==1 else (f'<html lang="en"><head><title>{name}</title></head><body><main><h1>{name}</h1><p>Synthetic heritage fixture {ordinal}: a substantial historical description used only for isolated stress testing.</p><img src="https://whc.unesco.org/__stress_fixture__/{ordinal}.png" alt="{name}" width="640" height="480"></main></body></html>').encode()
        return FetchResult(url,url,200,'text/html',body,AllowedRobots().check(url))
    def close(self): pass


def run(count,approval_count):
    overall=time.perf_counter(); cpu=time.process_time(); timings={}; unexpected=[]
    def timed(label,operation):
        start=time.perf_counter(); value=operation(); timings[label]=round(time.perf_counter()-start,4)
        print(json.dumps({'stage':label,'seconds':timings[label]}),flush=True)
        return value
    rng=random.Random(527)
    names=[''.join(rng.choices('abcdefghijklmnopqrstuvwxyz',k=24)) for _ in range(count)]
    expected=[]
    for i in range(100,count):
        if i%100==3: names[i]=names[i-5]; expected.append((i-5,i))
        if i%100==4: names[i]=names[i-5][:-1]+('z' if names[i-5][-1]!='z' else 'q'); expected.append((i-5,i))
    with tempfile.TemporaryDirectory(prefix='heritage-stress-') as directory:
        root=Path(directory); storage=Storage(root/'data'); registry=SourceRegistry()
        jobs=[{'source':'unesco','governorate':GOVERNORATES[i%5],'url':f'https://whc.unesco.org/__stress_fixture__/{i}','siteId':f'stress-{i}','name':names[i]} for i in range(count)]
        storage.save_json(root/'jobs.json',{'jobs':jobs})
        client=FixtureFetcher(names)
        def collect():
            with contextlib.redirect_stdout(io.StringIO()): return run_batch(root/'jobs.json',registry,storage,client,root/'batch.json')
        timed('fetch_extract_evidence_logs',collect)
        batch=read_json(root/'batch.json')
        expected_failures=sum(i%100 in {0,1} for i in range(count))
        if batch['summary']['failed']!=expected_failures: unexpected.append('Unexpected collection failure count.')
        records=[]
        manifests={read_json(path)['evidence_id']:read_json(path) for path in storage.raw_dir.rglob('*.evidence.json')}
        for draft_path in storage.drafts_dir.rglob('*.json'):
            draft=read_json(draft_path); ref=draft['source_evidence'][0]
            evidence=manifests[ref]
            i=int(evidence['final_url'].rsplit('/',1)[-1])
            records.append({'id':f'stress-{i}','name':draft['candidate_name'],'governorate':draft['governorate'],'category':'Synthetic test fixture','period':'',
                'description':draft['candidate_summary'],'unesco':None,'has3D':None,'coverImage':None,'galleryImages':[],
                'sources':[{'sourceName':'Synthetic response on configured UNESCO host (mock only)','url':evidence['final_url'],'evidenceId':ref,'accessedAt':evidence['retrieved_at']}],
                'source_evidence':[ref],'image_candidates':draft['image_candidates'],'status':'needs-review'})
        records.sort(key=lambda record:int(record['id'].split('-')[1]))
        storage.save_json(root/'records.json',records)
        valid=timed('validation',lambda:[validate_site_record(record) for record in records])
        invalid=sum(not item['is_valid'] for item in valid)
        if invalid: unexpected.append(f'{invalid} unexpected invalid records.')
        pairs=timed('duplicate_detection',lambda:detect_possible_duplicates(records))
        actual={tuple(sorted((int(records[pair['left_index']]['id'].split('-')[1]),int(records[pair['right_index']]['id'].split('-')[1])))) for pair in pairs}
        missing=[pair for pair in expected if pair not in actual]
        if missing: unexpected.append(f'{len(missing)} injected duplicate pairs missed.')
        pixels=io.BytesIO(); Image.new('RGB',(640,480),'brown').save(pixels,format='PNG')
        session=ImageSession(pixels.getvalue())
        validator=ImageURLValidator(registry=registry,session=session,robots_checker=AllowedRobots(),min_delay=0,policy=RequestPolicy(max_attempts=1),logger=PipelineLogger(storage))
        def images():
            identities=ImageIdentityIndex(records)
            return [prepare_gallery(record,validator,identities) for record in records]
        image_records=timed('image_processing',images)
        from collections import Counter
        name_counts=Counter(record['name'] for record in records)
        ambiguous=sum(name_counts[record['name']]>1 for record in records)
        expected_image_failures=sum(int(record['id'].split('-')[1])%100 in {2,6} and name_counts[record['name']]==1 for record in records)
        galleries=sum(len(record['galleryImages']) for record in image_records)
        if galleries!=len(records)-expected_image_failures-ambiguous: unexpected.append('Unexpected gallery inclusion count.')
        repo=timed('evidence_index',lambda:EvidenceRepository(storage.base_dir))
        def verify_evidence(ref):
            try:
                repo.snapshot(ref)
                return None
            except Exception as exc:
                return {'evidenceId':ref,'error':str(exc)}
        def evidence_integrity():
            with ThreadPoolExecutor(max_workers=4) as readers:
                return [item for item in readers.map(verify_evidence,repo.index) if item is not None]
        evidence_failures=timed('evidence_hash_integrity',evidence_integrity)
        if evidence_failures: unexpected.append('Stored evidence failed complete raw SHA-256 verification.')
        workflow=ReviewWorkflow(storage,repo)
        pending=timed('review_listing',lambda:workflow.list_records(image_records))
        if len(pending)!=len(records): unexpected.append('Unreviewed fixtures were silently approved.')
        selected=image_records[:min(approval_count,len(image_records))]
        rejected=image_records[len(selected):len(selected)+10]
        def decisions():
            for record in selected: workflow.decide(record,'approved','STRESS TEST FIXTURE','Synthetic fixture approval only; no real records or image rights approved.',root/'records.json')
            for record in rejected: workflow.decide(record,'rejected','STRESS TEST FIXTURE','Synthetic rejection fixture only.',root/'records.json')
        timed('review_decisions',decisions)
        exported,report=timed('approved_export',lambda:export_records(image_records,workflow))
        approved_names=Counter(record['name'] for record in selected)
        expected_exports=sum(approved_names[record['name']]==1 for record in selected)
        if len(exported)!=expected_exports: unexpected.append('Approved export count mismatch after expected route-collision exclusions.')
        if any(record['galleryImages'] or record['coverImage'] for record in exported): unexpected.append('Unverified media crossed the export approval gate.')
        events=list((storage.logs_dir/'pipeline').rglob('*.json'))
        def check_logs():
            required={'timestamp','source','url','governorate','operation','result','errors','evidence_id'}
            # Bounded parallel reads avoid making the verification harness's
            # sequential small-file I/O the dominant pipeline benchmark stage.
            with ThreadPoolExecutor(max_workers=8) as readers:
                return sum(not required<=set(value) for value in readers.map(read_json,events))
        invalid_logs=timed('log_integrity',check_logs)
        if invalid_logs: unexpected.append('Malformed structured event logs.')
        disk_bytes=sum(path.stat().st_size for path in root.rglob('*') if path.is_file())
        result={'records_requested':count,'records_collected':len(records),'expected_collection_failures':expected_failures,'actual_collection_failures':batch['summary']['failed'],
            'validation_failures':invalid,'duplicate_pairs':len(pairs),'injected_duplicate_pairs':len(expected),'missed_injected_duplicates':len(missing),
            'image_requests':session.calls,'ambiguous_images_expected':ambiguous,'image_failures_expected':expected_image_failures,'gallery_images':galleries,
            'approved_fixture_records':len(selected),'rejected_fixture_records':len(rejected),'expected_exports_after_route_checks':expected_exports,'exported_approved_fixture_records':len(exported),'real_approvals':0,
            'unverified_media_exported':0,'event_logs':len(events),'invalid_logs':invalid_logs,'evidence_manifests':len(repo.index),'evidence_hash_failures':evidence_failures,'log_audit_reader_threads':8,
            'timings_seconds':timings,'total_seconds':round(time.perf_counter()-overall,4),'cpu_seconds':round(time.process_time()-cpu,4),
            'peak_process_working_set_mb':peak_memory_mb(),'isolated_artifact_bytes':disk_bytes,'unexpected_failures':unexpected,
            'fixture_mode':'Synthetic HTML and mocked network/image responses; actual extraction, decoding, disk storage, logging, review and export. Temporary artifacts removed.'}
        return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--records',type=int,default=1000)
    parser.add_argument('--approvals',type=int,default=100)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.records<10 or args.approvals<1: parser.error('Use at least 10 records and one fixture approval.')
    target=args.output.resolve()
    pipeline=Path(__file__).resolve().parents[1]
    if target.is_relative_to((pipeline.parents[1]/'src').resolve()) or (target.is_relative_to((pipeline/'data').resolve()) and not target.is_relative_to((pipeline/'data/testing').resolve())):
        parser.error('Use separate scratch output or data/testing; real data/frontend files are protected.')
    report=run(args.records,args.approvals)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2),flush=True)
    return 1 if report['unexpected_failures'] else 0


if __name__=='__main__': raise SystemExit(main())
