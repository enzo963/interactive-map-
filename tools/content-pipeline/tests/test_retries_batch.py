import contextlib
import io
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path
from unittest.mock import Mock

import requests

from hb_pipeline.config import SourceRegistry
from hb_pipeline.errors import FetchError
from hb_pipeline.fetcher import TrustedFetcher, FetchResult
from hb_pipeline.http import RetryClient, RequestPolicy, read_limited
from hb_pipeline.models import RobotsDecision, SourceSpec
from hb_pipeline.robots import RobotsChecker
from hb_pipeline.storage import Storage
from main import run_batch, build_parser
from test_fetcher import response
from test_gallery_images import Reply, image_bytes, checker
from test_validation import HTML


class RetryTests(unittest.TestCase):
    def client(self, replies, **policy):
        session, sleeper = Mock(), Mock()
        session.get.side_effect = replies
        return RetryClient(session, RequestPolicy(**policy), sleeper=sleeper), session, sleeper

    def test_503_recovers_with_bounded_backoff_and_attempt_history(self):
        first = response('https://example.com/a',503)
        client,session,sleep = self.client([first,response('https://example.com/a')])
        history=[]
        reply,_ = client.get('https://example.com/a',timeout=(2,3),history=history)
        self.assertEqual(reply.status_code,200)
        self.assertEqual(len(history),2)
        sleep.assert_called_once_with(1)
        self.assertFalse(session.get.call_args.kwargs['allow_redirects'])
        self.assertEqual(session.get.call_args.kwargs['timeout'],(2,3))

    def test_permanent_statuses_never_retry(self):
        for code in [400,401,403,404,410,422,501,505]:
            with self.subTest(code=code):
                client,session,sleep=self.client([response('https://example.com/a',code)])
                reply,_=client.get('https://example.com/a',timeout=3)
                self.assertEqual(reply.status_code,code)
                self.assertEqual(session.get.call_count,1)
                sleep.assert_not_called()

    def test_temporary_statuses_retry_only_to_cap(self):
        for code in [408,429,500,502,503,504]:
            with self.subTest(code=code):
                client,session,sleep=self.client([response('https://example.com/a',code) for _ in range(3)])
                history=[]
                reply,_=client.get('https://example.com/a',timeout=3,history=history)
                self.assertEqual(reply.status_code,code)
                self.assertEqual(session.get.call_count,3)
                self.assertEqual([item.args[0] for item in sleep.call_args_list],[1,2])
                self.assertEqual(len(history),3)

    def test_retry_after_seconds_respected(self):
        client,_,sleep=self.client([response('https://example.com/a',429,headers={'Retry-After':'4'}),response('https://example.com/a')])
        client.get('https://example.com/a',timeout=3)
        sleep.assert_called_once_with(4)

    def test_long_retry_after_defers_instead_of_retrying_early(self):
        client,session,sleep=self.client([response('https://example.com/a',429,headers={'Retry-After':'120'})])
        history=[]
        reply,_=client.get('https://example.com/a',timeout=3,history=history)
        self.assertEqual(reply.status_code,429)
        self.assertEqual(session.get.call_count,1)
        self.assertIn('retry_deferred',history[0])
        sleep.assert_not_called()

    def test_retry_after_http_date(self):
        future=format_datetime(datetime.now(timezone.utc)+timedelta(seconds=10),usegmt=True)
        client,_,sleep=self.client([response('https://example.com/a',503,headers={'Retry-After':future}),response('https://example.com/a')])
        client.get('https://example.com/a',timeout=3)
        self.assertTrue(8 <= sleep.call_args.args[0] <= 10)

    def test_bad_retry_after_uses_backoff(self):
        client,_,sleep=self.client([response('https://example.com/a',503,headers={'Retry-After':'garbage'}),response('https://example.com/a')])
        client.get('https://example.com/a',timeout=3)
        sleep.assert_called_once_with(1)

    def test_timeout_and_connection_errors_recover(self):
        for error in [requests.Timeout('slow'),requests.ConnectionError('offline')]:
            client,session,_=self.client([error,response('https://example.com/a')])
            self.assertEqual(client.get('https://example.com/a',timeout=3)[0].status_code,200)
            self.assertEqual(session.get.call_count,2)

    def test_network_exhaustion_preserves_attempts(self):
        client,session,_=self.client([requests.Timeout('slow') for _ in range(3)])
        with self.assertRaises(requests.Timeout) as caught:
            client.get('https://example.com/a',timeout=3)
        self.assertEqual(len(caught.exception.pipeline_attempts),3)
        self.assertEqual(session.get.call_count,3)

    def test_certificate_failure_is_not_retried(self):
        client,session,sleep=self.client([requests.exceptions.SSLError('certificate')])
        with self.assertRaises(requests.exceptions.SSLError):
            client.get('https://example.com/a',timeout=3)
        self.assertEqual(session.get.call_count,1)
        sleep.assert_not_called()

    def test_broken_body_stream_retries_the_whole_get(self):
        first=Reply(image_bytes(),stream_error=requests.exceptions.ChunkedEncodingError('interrupted'))
        client,session,_=self.client([first,Reply(image_bytes())])
        reply,data=client.get('https://example.com/a',timeout=3,stream=True,consume=lambda r:read_limited(r,10000))
        self.assertEqual(data,image_bytes())
        self.assertTrue(first.closed)
        self.assertEqual(session.get.call_count,2)
        reply.close()

    def test_invalid_retry_configuration_rejected(self):
        for options in [{'max_attempts':0},{'max_attempts':6},{'base_delay':-1},{'max_delay':31},{'max_retry_after':60}]:
            with self.assertRaises(ValueError):
                RequestPolicy(**options)

    def test_robots_temporary_failure_retries_but_denial_does_not(self):
        session=Mock()
        session.get.side_effect=[response('https://example.com/robots.txt',503),response('https://example.com/robots.txt',body=b'User-agent: *\nDisallow: /',headers={'Content-Type':'text/plain'})]
        checker=RobotsChecker(session,'test',policy=RequestPolicy(base_delay=0,max_delay=0))
        decision=checker.check('https://example.com/a')
        self.assertEqual(decision.status,'denied')
        self.assertEqual(len(decision.attempts),2)
        self.assertEqual(session.get.call_count,2)

    def test_robots_403_and_404_do_not_retry(self):
        for status in [403,404]:
            session=Mock()
            session.get.return_value=response('https://example.com/robots.txt',status)
            decision=RobotsChecker(session,'test').check('https://example.com/a')
            self.assertFalse(decision.may_fetch)
            self.assertEqual(session.get.call_count,1)

    def test_fetch_http_failure_has_code_status_and_attempts(self):
        fetcher=TrustedFetcher(min_delay_seconds=0)
        self.addCleanup(fetcher.close)
        fetcher.session=Mock()
        fetcher.session.get.return_value=response('https://example.com/a',404)
        fetcher.robots_checker=Mock()
        fetcher.robots_checker.check.return_value=RobotsDecision('allowed','robots','url','test')
        with self.assertRaises(FetchError) as caught:
            fetcher.fetch('https://example.com/a',SourceSpec('test','Test',1,['example.com']))
        self.assertEqual(caught.exception.http_status,404)
        self.assertFalse(caught.exception.retryable)
        self.assertEqual(len(caught.exception.attempts),1)

    def test_image_429_retries_and_404_remains_permanent(self):
        for replies,valid,count in [([Reply(status=429),Reply(image_bytes())],True,2),([Reply(status=404)],False,1)]:
            v,session,_=checker(replies)
            v.http.policy=RequestPolicy(base_delay=0,max_delay=0)
            result=v.validate('https://whc.unesco.org/a')
            self.assertEqual(result['valid'],valid)
            self.assertEqual(session.get.call_count,count)
            self.assertEqual(len(result['attempts']),count)

    def test_invalid_image_content_is_not_retried(self):
        v,session,_=checker([Reply(b'<html>wrong content</html>')])
        v.http.policy=RequestPolicy(base_delay=0,max_delay=0)
        self.assertFalse(v.validate('https://whc.unesco.org/a')['valid'])
        self.assertEqual(session.get.call_count,1)


class BatchTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.storage=Storage(self.root/'data')
        self.manifest,self.report=self.root/'jobs.json',self.root/'report.json'
        self.registry=SourceRegistry()
        self.fetcher=Mock()
        self.fetcher.last_attempts=[]
        self.result=FetchResult('https://whc.unesco.org/a','https://whc.unesco.org/a',200,'text/html',HTML,RobotsDecision('allowed','robots','url','test'))

    def run_batch(self,jobs):
        self.manifest.write_text(json.dumps({'jobs':jobs}),encoding='utf-8')
        before=self.manifest.read_bytes()
        with contextlib.redirect_stdout(io.StringIO()):
            code=run_batch(self.manifest,self.registry,self.storage,self.fetcher,self.report)
        self.assertEqual(self.manifest.read_bytes(),before)
        return code,json.loads(self.report.read_text(encoding='utf-8'))

    def job(self,**changes):
        return dict(source='unesco',governorate='erbil',url='https://whc.unesco.org/a',**changes)

    def test_failed_site_invalid_record_and_success_all_have_outcomes(self):
        self.fetcher.fetch.side_effect=[FetchError('HTTP 404',code='http-404',http_status=404),self.result]
        code,report=self.run_batch([self.job(),None,self.job()])
        self.assertEqual(code,2)
        self.assertEqual(report['summary'],{'total':3,'processed':1,'failed':2})
        self.assertEqual(report['items'][0]['error']['http_status'],404)
        self.assertTrue(all(item['status']=='needs-review' for item in report['items']))
        self.assertEqual(len(list(self.storage.drafts_dir.rglob('*.json'))),1)

    def test_invalid_html_does_not_save_draft_or_stop_next_site(self):
        invalid=FetchResult('https://whc.unesco.org/a','https://whc.unesco.org/a',200,'text/html',b'<html><title>Error</title></html>',self.result.robots)
        self.fetcher.fetch.side_effect=[invalid,self.result]
        code,report=self.run_batch([self.job(),self.job()])
        self.assertEqual(code,2)
        self.assertEqual(report['items'][0]['error']['code'],'invalid-content')
        self.assertEqual(report['items'][1]['outcome'],'processed')
        self.assertEqual(len(list(self.storage.raw_dir.rglob('*.html'))),1)

    def test_unknown_source_bad_governorate_and_bad_target_are_isolated(self):
        self.fetcher.fetch.return_value=self.result
        jobs=[dict(self.job(),source='unknown'),dict(self.job(),governorate='Atlantis'),dict(self.job(),siteId='missing-name'),self.job()]
        code,report=self.run_batch(jobs)
        self.assertEqual(report['summary']['failed'],3)
        self.assertEqual(report['summary']['processed'],1)
        self.assertEqual(self.fetcher.fetch.call_count,1)

    def test_unexpected_individual_fault_is_recorded_and_siblings_continue(self):
        self.fetcher.fetch.side_effect=[RuntimeError('fixture failure'),self.result]
        _,report=self.run_batch([self.job(),self.job()])
        self.assertEqual(report['items'][0]['error']['code'],'unexpected-error')
        self.assertEqual(report['items'][1]['outcome'],'processed')

    def test_batch_report_cannot_overwrite_manifest_or_raw_artifacts(self):
        self.manifest.write_text('[]',encoding='utf-8')
        for target in [self.manifest,self.storage.raw_dir/'overwrite.json']:
            with self.assertRaises(ValueError):
                run_batch(self.manifest,self.registry,self.storage,self.fetcher,target)
        self.fetcher.fetch.assert_not_called()

    def test_retry_and_timeout_cli_options_are_exposed(self):
        args=build_parser().parse_args(['batch','jobs.json','--max-attempts','2','--timeout','7'])
        self.assertEqual(args.max_attempts,2)
        self.assertEqual(args.timeout,7)


if __name__ == '__main__':
    unittest.main()
