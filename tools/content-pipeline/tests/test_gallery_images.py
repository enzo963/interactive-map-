import contextlib
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import requests
from PIL import Image

from hb_pipeline.http import RequestPolicy
from hb_pipeline.config import SourceRegistry
from hb_pipeline.image_validation import ImageURLValidator
from hb_pipeline.galleries import prepare_gallery, flag_shared_site_images
from hb_pipeline.models import RobotsDecision
from prepare_galleries import main


def image_bytes(fmt='PNG', width=32, height=24):
    out = io.BytesIO()
    Image.new('RGB', (width, height), 'red').save(out, format=fmt)
    return out.getvalue()


class Reply:
    def __init__(self, body=b'', status=200, mime='image/png', headers=None, stream_error=None):
        self.status_code = status
        self.headers = {'Content-Type': mime, **(headers or {})}
        self.body, self.stream_error = body, stream_error
        self.closed = False

    def iter_content(self, chunk_size):
        if self.stream_error:
            raise self.stream_error
        for start in range(0, len(self.body), chunk_size):
            yield self.body[start:start+chunk_size]

    def close(self):
        self.closed = True


def checker(replies=None, **kwargs):
    session, robots = Mock(), Mock()
    session.headers = {}
    session.get.side_effect = replies
    robots.check.side_effect = lambda url: RobotsDecision('allowed', 'https://whc.unesco.org/robots.txt', url, 'test')
    validator = ImageURLValidator(session=session, robots_checker=robots, min_delay=0, policy=RequestPolicy(max_attempts=1), **kwargs)
    return validator, session, robots


class ImageURLTests(unittest.TestCase):
    def test_real_decoding_supported_formats_and_response_cleanup(self):
        for fmt, mime in [('PNG','image/png'), ('JPEG','image/jpeg'), ('WEBP','image/webp'), ('GIF','image/gif')]:
            with self.subTest(fmt=fmt):
                reply = Reply(image_bytes(fmt), mime=mime)
                v, session, _ = checker([reply])
                result = v.validate('https://whc.unesco.org/photo.jpg')
                self.assertTrue(result['valid'])
                self.assertEqual((result['width'], result['height']), (32, 24))
                self.assertEqual(result['format'], fmt)
                self.assertEqual(len(result['sha256']), 64)
                self.assertTrue(reply.closed)
                self.assertFalse(session.get.call_args.kwargs['allow_redirects'])
                self.assertTrue(session.get.call_args.kwargs['stream'])

    def test_html_mislabeled_as_image_is_rejected(self):
        v, _, _ = checker([Reply(b'<html>Access denied</html>')])
        self.assertEqual(v.validate('https://whc.unesco.org/photo.jpg')['status'], 'decode-error')

    def test_http_errors_empty_body_and_non_image_types(self):
        for reply, status in [(Reply(status=404), 'http-error'), (Reply(status=503), 'http-error'),
                              (Reply(b''), 'decode-error'), (Reply(b'<html>Error</html>', mime='text/html'), 'unsupported-content')]:
            with self.subTest(status=status):
                v, _, _ = checker([reply])
                result = v.validate('https://whc.unesco.org/a')
                self.assertFalse(result['valid'])
                self.assertEqual(result['status'], status)
                self.assertTrue(reply.closed)

    def test_mime_must_agree_with_decoded_format(self):
        v, _, _ = checker([Reply(image_bytes('JPEG'), mime='image/png')])
        self.assertEqual(v.validate('https://whc.unesco.org/a')['status'], 'type-mismatch')

    def test_truncated_image_rejected(self):
        v, _, _ = checker([Reply(image_bytes()[:40])])
        self.assertFalse(v.validate('https://whc.unesco.org/a')['valid'])

    def test_size_budget_enforced_for_header_and_stream(self):
        for reply in [Reply(image_bytes(), headers={'Content-Length':'9999'}), Reply(image_bytes())]:
            v, _, _ = checker([reply], max_bytes=50)
            self.assertEqual(v.validate('https://whc.unesco.org/a')['status'], 'size-limit')
            self.assertTrue(reply.closed)

    def test_pixel_budget_and_animated_frame_budget(self):
        v, _, _ = checker([Reply(image_bytes(width=100,height=100))], max_pixels=100)
        self.assertEqual(v.validate('https://whc.unesco.org/a')['status'], 'size-limit')
        out = io.BytesIO()
        frames = [Image.new('RGB',(20,20),color) for color in ['red','blue']]
        frames[0].save(out, format='GIF', save_all=True, append_images=frames[1:])
        v, _, _ = checker([Reply(out.getvalue(), mime='image/gif')], max_frames=1)
        self.assertEqual(v.validate('https://whc.unesco.org/a')['status'], 'size-limit')

    def test_timeout_network_error_and_broken_stream_are_results(self):
        for failure in [requests.Timeout('slow'), requests.ConnectionError('offline'), Reply(image_bytes(), stream_error=requests.exceptions.ChunkedEncodingError('broken'))]:
            v, _, _ = checker([failure])
            result = v.validate('https://whc.unesco.org/a')
            self.assertFalse(result['valid'])
            self.assertIn(result['status'], ['timeout','network-error'])

    def test_policy_checks_precede_requests(self):
        for value in ['https://127.0.0.1/a', 'file:///a', 'https://unapproved.example/a']:
            v, session, _ = checker([])
            self.assertFalse(v.validate(value)['valid'])
            session.get.assert_not_called()
        v, session, robots = checker([])
        robots.check.side_effect = lambda url: RobotsDecision('denied', 'robots', url, 'test')
        self.assertEqual(v.validate('https://whc.unesco.org/a')['status'], 'policy-blocked')
        session.get.assert_not_called()

    def test_allowed_redirect_checked_and_final_url_preserved(self):
        redirect = Reply(status=302, headers={'Location':'/b'})
        v, session, robots = checker([redirect, Reply(image_bytes())])
        result = v.validate('https://whc.unesco.org/a')
        self.assertTrue(result['valid'])
        self.assertEqual(result['final_url'], 'https://whc.unesco.org/b')
        self.assertEqual(robots.check.call_count, 2)
        self.assertTrue(redirect.closed)

    def test_untrusted_redirect_is_not_requested(self):
        v, session, _ = checker([Reply(status=302, headers={'Location':'https://other.example/image'})])
        result = v.validate('https://whc.unesco.org/a')
        self.assertEqual(result['status'], 'policy-blocked')
        self.assertEqual(session.get.call_count, 1)

    def test_redirect_loop_and_missing_location(self):
        for reply in [Reply(status=302, headers={'Location':'/a'}), Reply(status=302)]:
            v, _, _ = checker([reply])
            self.assertEqual(v.validate('https://whc.unesco.org/a')['status'], 'redirect-error')

    def test_identical_url_cache_ignores_fragment_but_keeps_query(self):
        v, session, _ = checker([Reply(image_bytes()), Reply(image_bytes())])
        first = v.validate('HTTPS://WHC.UNESCO.ORG:443/a?width=100#one')
        cached = v.validate('https://whc.unesco.org/a?width=100#two')
        cached['valid'] = False
        self.assertTrue(v.validate('https://whc.unesco.org/a?width=100')['valid'])
        self.assertTrue(v.validate('https://whc.unesco.org/a?width=200')['valid'])
        self.assertEqual(session.get.call_count, 2)
        self.assertTrue(first['valid'])


SITE = {'id':'site-erbil', 'name':'Erbil Citadel', 'governorate':'Erbil', 'source_evidence':['evidence-1'], 'galleryImages':[]}
OTHER = {'id':'site-choli', 'name':'Choli Minaret'}


def candidate(url='https://whc.unesco.org/a.png', **kwargs):
    result = {'url':url, 'alt':'Erbil Citadel', 'caption':'Citadel walls', 'credit':'Photographer',
        'source':'img', 'source_id':'unesco', 'source_url':'https://whc.unesco.org/en/list/1437/',
        'license_hint':'CC BY 4.0 (reported)', 'license_url':'https://creativecommons.org/licenses/by/4.0/',
        'license_status':'unverified', 'verification_status':'unverified', 'review_required':True,
        'siteId':'site-erbil', 'targetSiteId':'site-erbil', 'association_status':'matched-unverified',
        'association_evidence':[{'kind':'alt','text':'Erbil Citadel','matched_names':['erbil citadel']}],
        'contexts':[{'alt':'Erbil Citadel','caption':'Citadel walls','filename':'a.png'}],
        'evidenceId':'evidence-1', 'accessedAt':'2026-10-31T10:00:00+00:00'}
    result.update(kwargs)
    return result


class GalleryTests(unittest.TestCase):
    def prepare(self, candidates, replies=None, **site_fields):
        site = dict(SITE, image_candidates=candidates, **site_fields)
        v, session, _ = checker(replies or [])
        result = prepare_gallery(site, v, [SITE, OTHER])
        return result, site, session

    def test_gallery_has_site_source_license_and_decoding_metadata(self):
        result, original, _ = self.prepare([candidate()], [Reply(image_bytes())])
        image = result['galleryImages'][0]
        self.assertEqual(image['siteId'], 'site-erbil')
        self.assertEqual(image['sourceName'], 'UNESCO World Heritage Centre')
        self.assertEqual(image['license'], 'CC BY 4.0 (reported)')
        self.assertEqual(image['license_status'], 'unverified')
        self.assertEqual(image['source_observations'], [candidate()])
        self.assertTrue(image['url_validation'][0]['valid'])
        self.assertEqual(original['galleryImages'], [])
        self.assertEqual(result['verification']['status'], 'unverified')
        self.assertEqual(result['provenance']['galleryImages'], ['evidence-1'])

    def test_duplicate_urls_merge_without_losing_source_license_observations(self):
        first = candidate(url='HTTPS://WHC.UNESCO.ORG:443/a.png#one')
        second = candidate(url='https://whc.unesco.org/a.png#two', license_hint='Different reported terms', credit='Other credit')
        result, _, session = self.prepare([first, second], [Reply(image_bytes())])
        self.assertEqual(len(result['galleryImages']), 1)
        self.assertEqual(len(result['galleryImages'][0]['source_observations']), 2)
        self.assertEqual(result['gallery_review']['duplicates_removed'], 1)
        self.assertEqual(session.get.call_count, 1)

    def test_distinct_requested_urls_redirecting_to_same_image_deduplicate(self):
        result, _, _ = self.prepare([candidate('/invalid')])
        self.assertEqual(result['galleryImages'], [])
        result, _, _ = self.prepare([candidate(), candidate(url='https://whc.unesco.org/alias.png')],
            [Reply(image_bytes()), Reply(status=302, headers={'Location':'/a.png'}), Reply(image_bytes())])
        self.assertEqual(len(result['galleryImages']), 1)
        self.assertEqual(len(result['galleryImages'][0]['url_validation']), 2)

    def test_broken_html_timeout_skipped_and_good_sibling_still_prepared(self):
        result, _, _ = self.prepare([candidate(url='https://whc.unesco.org/'+name) for name in ['broken','html','slow','good']],
                                   [Reply(status=404), Reply(b'<html>error</html>'), requests.Timeout('slow'), Reply(image_bytes())])
        self.assertEqual(len(result['galleryImages']), 1)
        self.assertEqual(len(result['gallery_review']['skipped_images']), 3)
        self.assertEqual(len(result['gallery_review']['network_checks']), 4)

    def test_unrelated_uncertain_and_forged_location_matches_not_requested(self):
        items = [candidate(siteId=None, association_status='uncertain'),
                 candidate(contexts=[{'alt':'Erbil','caption':'A governorate image'}]),
                 candidate(siteId='another-site'), candidate(evidenceId='missing')]
        result, _, session = self.prepare(items)
        self.assertEqual(result['galleryImages'], [])
        session.get.assert_not_called()

    def test_conflicting_observations_exclude_entire_image(self):
        other = candidate(contexts=[{'alt':'Choli Minaret'}],siteId=None,association_status='unmatched')
        result, _, session = self.prepare([candidate(), other])
        self.assertEqual(result['galleryImages'], [])
        session.get.assert_not_called()

    def test_source_impersonation_and_malformed_candidates_do_not_stop_siblings(self):
        result, _, _ = self.prepare([None, candidate(source_url='https://other.example/page'), candidate()], [Reply(image_bytes())])
        self.assertEqual(len(result['galleryImages']), 1)
        self.assertTrue(result['gallery_review']['skipped_images'])
        self.assertTrue(result['galleryImages'][0]['metadata_findings'])

    def test_shared_final_image_claimed_by_different_sites_requires_review(self):
        first, _, _ = self.prepare([candidate()], [Reply(image_bytes())])
        second = copy.deepcopy(first)
        second['id'] = 'site-choli'
        conflicts = flag_shared_site_images([first,second])
        self.assertEqual(len(conflicts),1)
        self.assertEqual(first['galleryImages'],[])
        self.assertEqual(second['galleryImages'],[])
        self.assertEqual(first['gallery_review']['gallery_count'],0)
        self.assertTrue(first['gallery_review']['skipped_images'][0]['image']['source_observations'])

    def test_malformed_license_metadata_is_skipped_and_retained_for_review(self):
        result, _, session = self.prepare([candidate(license_hint=['bad-type'])])
        self.assertEqual(result['galleryImages'],[])
        session.get.assert_not_called()
        self.assertTrue(result['gallery_review']['skipped_images'])

    def test_previous_gallery_and_candidates_preserved_for_audit_no_input_mutation(self):
        site = dict(SITE, image_candidates=[candidate()], galleryImages=[{'src':'/legacy.jpg'}])
        original = copy.deepcopy(site)
        v, _, _ = checker([Reply(image_bytes())])
        result = prepare_gallery(site, v, [SITE])
        self.assertEqual(site, original)
        self.assertEqual(result['gallery_review']['original_galleryImages'], [{'src':'/legacy.jpg'}])
        self.assertEqual(result['image_candidates'], original['image_candidates'])

    def test_empty_candidates_produce_empty_gallery(self):
        result, _, session = self.prepare([])
        self.assertEqual(result['galleryImages'], [])
        session.get.assert_not_called()


class GalleryCLITests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, name, content):
        path = self.root/name
        path.write_text(json.dumps(content),encoding='utf-8')
        return path

    def run_cli(self, inputs, validator, output=None):
        output = output or self.root/'out.json'
        with patch('prepare_galleries.BASE', self.root), patch('prepare_galleries.ImageURLValidator', return_value=validator), contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            code = main([*(str(p) for p in inputs), '--output', str(output)])
        return code, output

    def test_corrupt_input_and_invalid_record_do_not_block_good_site(self):
        good = self.write('good.json',[dict(SITE,image_candidates=[candidate()]), 'malformed'])
        bad = self.root/'bad.json'
        bad.write_text('not-json',encoding='utf-8')
        v, _, _ = checker([Reply(image_bytes())])
        code, out = self.run_cli([bad,good],v)
        self.assertEqual(code,2)
        result = json.loads(out.read_text(encoding='utf-8'))
        self.assertEqual(result['summary']['gallery_images'],1)
        self.assertEqual(result['summary']['record_errors'],1)
        self.assertEqual(len(result['summary']['input_errors']),1)

    def test_input_and_raw_and_frontend_output_targets_protected(self):
        path = self.write('site.json',SITE)
        before = path.read_bytes()
        for output in [path,self.root/'data/raw/fake.json',self.root.parents[1]/'src/fake.json']:
            v, session, _ = checker([])
            code, _ = self.run_cli([path],v,output)
            self.assertEqual(code,1)
            session.get.assert_not_called()
        self.assertEqual(path.read_bytes(),before)


if __name__ == '__main__':
    unittest.main()
