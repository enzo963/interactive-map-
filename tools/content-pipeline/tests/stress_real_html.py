"""Repeat extraction of real HTML from an isolated E2E run; no network requests."""
import argparse
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from hb_pipeline.evidence_repository import EvidenceRepository,read_json
from hb_pipeline.extractor import extract_page
from hb_pipeline.images import ImageIdentityIndex


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',type=Path,required=True,help='result.json produced by e2e_real_sites.py')
    parser.add_argument('--iterations',type=int,default=250)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.iterations<1: parser.error('Iterations must be positive.')
    target=args.output.resolve()
    pipeline=Path(__file__).resolve().parents[1]
    if target==args.run.resolve() or target.is_relative_to((pipeline.parents[1]/'src').resolve()) or (target.is_relative_to((pipeline/'data').resolve()) and not target.is_relative_to((pipeline/'data/testing').resolve())):
        parser.error('Use separate scratch output or data/testing; input/data/frontend files are protected.')
    result=read_json(args.run)
    if not result.get('test_only'): parser.error('Expected an isolated test-run result.')
    repo=EvidenceRepository(Path(result['isolated_data_root']))
    catalog=[{'id':item['id'],'name':item['name']} for item in result['source_sites']]
    identities=ImageIdentityIndex(catalog)
    fixtures=[]
    for item in result['source_sites']:
        _,source,raw,_,citation=repo.snapshot(item['evidence_id'])
        fixtures.append((item,source,raw,citation['url']))
    if not fixtures: parser.error('No captured real HTML is available in this run.')
    start=time.perf_counter(); durations=[]; failures=[]
    for i in range(args.iterations):
        item,source,raw,url=fixtures[i%len(fixtures)]
        tick=time.perf_counter()
        try:
            extraction=extract_page(raw,url,target_site={'id':item['id'],'name':item['name']},source=source,known_sites=identities)
            if extraction.title!=item['extracted_title'] or not extraction.paragraphs:
                raise AssertionError('Extraction title/content missing or inconsistent.')
        except Exception as exc: failures.append({'index':i,'error':str(exc)})
        durations.append(time.perf_counter()-tick)
        if (i+1)%50==0: print(f'Extracted {i+1}/{args.iterations}',flush=True)
    report={'mode':'Repeated extraction of saved fresh real source HTML; no repeated HTTP requests or publishing.',
        'iterations':args.iterations,'source_html_bytes':[len(raw) for _,_,raw,_ in fixtures],
        'total_seconds':round(time.perf_counter()-start,4),'median_ms':round(statistics.median(durations)*1000,3),
        'p95_ms':round(sorted(durations)[int(.95*(len(durations)-1))]*1000,3),'failures':failures}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2),flush=True)
    return 1 if failures else 0


if __name__=='__main__': raise SystemExit(main())
