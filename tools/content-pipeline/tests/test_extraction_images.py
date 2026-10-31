import contextlib
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hb_pipeline.config import SourceRegistry
from hb_pipeline.evidence_repository import EvidenceRepository
from hb_pipeline.extractor import extract_page
from hb_pipeline.images import select_cover
from hb_pipeline.storage import Storage
from hb_pipeline.utils import sha256_bytes
from hb_pipeline.errors import ValidationError
from hb_pipeline.validation import validate_image_association
from prepare_images import prepare, main

SUMMARY = 'Erbil Citadel is a documented archaeological settlement with historic streets and surviving houses.'
SITE = {'id': 'site-erbil', 'name': 'Erbil Citadel', 'governorate': 'Erbil', 'alternativeNames': ['Citadel of Erbil']}
OTHER = {'id': 'site-choli', 'name': 'Choli Minaret'}


def html(content='', head='', lang='en'):
    return f'<html lang="{lang}"><head><title>Government portal</title>{head}</head><body><main><h1>Erbil Citadel</h1><p>{SUMMARY}</p>{content}</main></body></html>'.encode('utf-8')


class ImprovedExtractionTests(unittest.TestCase):
    def extract(self, content='', head='', lang='en'):
        return extract_page(html(content, head, lang), 'https://gov.krd/history')

    def test_content_title_wins_over_portal_title(self):
        self.assertEqual(self.extract().title, 'Erbil Citadel')

    def test_document_title_identifies_content_heading_below_corporate_h1(self):
        page = html('<h2>History</h2>').replace(b'Government portal', b'Region | History').replace(b'<h1>Erbil Citadel</h1>', b'<h1>Board of Investment</h1>')
        self.assertEqual(extract_page(page, 'https://gov.krd/history').title, 'History')

    def test_named_supplementary_card_module_is_removed(self):
        result = self.extract('<div class="border-top"><span class="h5">News</span><a name="news"></a><img src="/other.jpg"><p>Unrelated news cards should not become the historic site description.</p></div>')
        self.assertEqual(result.paragraphs, [SUMMARY])
        self.assertEqual(result.image_candidates, [])

    def test_meta_title_and_description_fallback(self):
        result = extract_page(f'<head><meta property="og:title" content="Delal Bridge"><meta name="description" content="{SUMMARY}"></head><body></body>'.encode(), 'https://gov.krd/history')
        self.assertEqual(result.title, 'Delal Bridge')
        self.assertEqual(result.meta_description, SUMMARY)

    def test_main_content_excludes_other_page_regions(self):
        page = html('<article><header><h2>Conservation</h2></header><p>The conservation programme protects the houses and streets of the historic citadel.</p></article>')
        page = page.replace(b'<main>', b'<header><h1>Portal navigation</h1></header><p>Unrelated introductory text outside the article should not be extracted.</p><main>')
        result = extract_page(page, 'https://gov.krd/history')
        self.assertEqual(result.headings, ['Erbil Citadel', 'Conservation'])
        self.assertEqual(len(result.paragraphs), 2)

    def test_boilerplate_hidden_and_related_content_removed(self):
        noise = 'This unrelated content must not appear in the extracted heritage description.'
        content = ''.join(f'<{tag}><p>{noise}</p><img src="/{tag}.jpg"></{tag}>' for tag in ['nav', 'footer', 'aside', 'script', 'template', 'form'])
        content += ''.join(f'<div {attr}><p>{noise}</p></div>' for attr in ['class="related-posts"', 'id="cookie-consent"', 'role="navigation"', 'hidden', 'aria-hidden="true"', 'style="display: none"'])
        result = self.extract(content)
        self.assertEqual(result.paragraphs, [SUMMARY])
        self.assertEqual(result.image_candidates, [])

    def test_theme_footer_class_on_body_does_not_remove_entire_page(self):
        page = html().replace(b'<body>', b'<body class="page-template-elementor_header_footer ehf-footer">')
        result = extract_page(page, 'https://gov.krd/history')
        self.assertEqual(result.paragraphs, [SUMMARY])

    def test_useful_list_items_and_definition_text_are_retained(self):
        facts = 'The bridge is an ancient stone structure believed to have a Roman or medieval origin.'
        result = self.extract(f'<ul><li>{facts}</li></ul><dl><dd>{facts}</dd></dl>')
        self.assertIn(facts, result.paragraphs)
        self.assertEqual(result.paragraphs.count(facts), 1)

    def test_link_dense_paragraph_does_not_become_content(self):
        result = self.extract('<p><a href="/news">Latest news and government services with many unrelated tourist links and contact details.</a></p>')
        self.assertEqual(result.paragraphs, [SUMMARY])

    def test_plain_text_official_page_and_description_fallback(self):
        result = extract_page(f'<title>Delal Bridge</title><div class="entry-content"><div>{SUMMARY}</div></div>'.encode(), 'https://gov.krd/history')
        self.assertIn(SUMMARY, result.paragraphs)
        self.assertEqual(result.meta_description, SUMMARY)

    def test_relative_canonical_and_language_normalized(self):
        result = self.extract(head='<link rel="alternate canonical" href="/citadel#photo">', lang='ku_Arab')
        self.assertEqual(result.canonical_url, 'https://gov.krd/citadel')
        self.assertEqual(result.language, 'ku-Arab')

    def test_invalid_canonical_and_language_are_not_invented(self):
        result = self.extract(head='<link rel="canonical" href="javascript:alert(1)">', lang='unknown language!')
        self.assertEqual(result.canonical_url, '')
        self.assertEqual(result.language, '')

    def test_language_metadata_fallback(self):
        result = self.extract(head='<meta http-equiv="Content-Language" content="ar-IQ">', lang='')
        self.assertEqual(result.language, 'ar-IQ')

    def test_unicode_content_keeps_names_and_language(self):
        phrase = '\u0642\u0644\u0639\u0629 \u0623\u0631\u0628\u064a\u0644'
        result = self.extract(f'<h2>{phrase}</h2>', lang='ar')
        self.assertIn(phrase, result.headings)

    def test_access_challenge_document_title_still_rejected(self):
        with self.assertRaises(ValidationError):
            extract_page(html().replace(b'Government portal', b'Access denied'), 'https://gov.krd/history')


class HeritageImageTests(unittest.TestCase):
    def setUp(self):
        self.registry = SourceRegistry()

    def extract(self, content='', head='', target=SITE, known=None, source_id='krg'):
        source = self.registry.get(source_id)
        page = 'https://' + source.domains[0] + '/history'
        return extract_page(html(content, head), page, target_site=target, source=source, known_sites=known or [SITE, OTHER])

    def candidate(self, source_id='krg', src='/citadel.jpg', alt='Erbil Citadel', width=1200, height=800):
        return self.extract(f'<img src="{src}" alt="{alt}" width="{width}" height="{height}">', source_id=source_id).image_candidates[0]

    def test_exact_alt_associates_stable_id_but_never_verifies(self):
        item = self.candidate()
        self.assertEqual(item['siteId'], SITE['id'])
        self.assertEqual(item['source_url'], 'https://gov.krd/history')
        self.assertEqual(item['source_id'], 'krg')
        self.assertEqual(item['license_status'], 'unverified')
        self.assertEqual(item['verification_status'], 'unverified')
        self.assertTrue(item['review_required'])

    def test_alias_and_caption_match(self):
        item = self.extract('<figure><img src="/photo.jpg" alt="Stone walls"><figcaption>Citadel of Erbil, western wall</figcaption></figure>').image_candidates[0]
        self.assertEqual(item['siteId'], SITE['id'])
        self.assertEqual(item['association_evidence'][0]['kind'], 'caption')

    def test_governorate_page_title_and_section_proximity_never_associate(self):
        for content in ['<h2>Erbil Citadel</h2><img src="/photo.jpg" alt="Erbil">', '<img src="/photo.jpg">']:
            item = self.extract(content).image_candidates[0]
            self.assertIsNone(item['siteId'])
            self.assertEqual(item['targetSiteId'], SITE['id'])

    def test_governorate_only_site_name_not_enough(self):
        item = self.extract('<img src="/photo.jpg" alt="Erbil">', target={'id': 'bad-site', 'name': 'Erbil'}).image_candidates[0]
        self.assertIsNone(item['siteId'])

    def test_filename_alone_is_uncertain(self):
        item = self.extract('<img src="/Erbil_Citadel.jpg" alt="Old walls">').image_candidates[0]
        self.assertEqual(item['association_status'], 'uncertain')
        self.assertIsNone(item['siteId'])

    def test_name_boundary_prevents_partial_matching(self):
        item = self.extract('<img src="/photo.jpg" alt="Erbil Citadels and other buildings">').image_candidates[0]
        self.assertIsNone(item['siteId'])

    def test_other_site_and_multi_site_metadata_not_assigned(self):
        for alt in ['Choli Minaret', 'Erbil Citadel and Choli Minaret']:
            item = self.candidate(alt=alt, src='/photo.jpg')
            self.assertIsNone(item['siteId'])
            self.assertIn(item['association_status'], ['ambiguous', 'unmatched'])

    def test_same_url_with_conflicting_alt_is_ambiguous(self):
        items = self.extract('<img src="/same.jpg" alt="Erbil Citadel"><img src="/same.jpg" alt="Choli Minaret">').image_candidates
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['association_status'], 'ambiguous')
        self.assertEqual(len(items[0]['contexts']), 2)

    def test_targetless_extraction_remains_unassigned(self):
        item = self.extract('<img src="/photo.jpg" alt="Erbil Citadel">', target=None).image_candidates[0]
        self.assertIsNone(item['siteId'])
        self.assertEqual(item['association_status'], 'unassigned')

    def test_placeholder_lazy_src_and_largest_srcset(self):
        items = self.extract('<img src="data:image/gif;base64,AA" data-src="/lazy.jpg" alt="Erbil Citadel"><picture><source srcset="/small.jpg 400w, /large.jpg 1600w"><img src="/fallback.jpg" alt="Erbil Citadel" width="400" height="200"></picture>').image_candidates
        self.assertEqual(items[0]['url'], 'https://gov.krd/lazy.jpg')
        self.assertEqual(items[1]['url'], 'https://gov.krd/large.jpg')
        self.assertEqual(items[1]['width'], 1600)
        self.assertEqual(items[1]['height'], 800)

    def test_decorative_private_and_script_urls_ignored(self):
        items = self.extract('<img src="/logo.png" alt="Erbil Citadel"><img src="/tiny.jpg" width="1" height="1"><img src="javascript:alert(1)"><img src="http://127.0.0.1/photo.jpg">').image_candidates
        self.assertEqual(items, [])

    def test_og_image_without_image_alt_not_assigned_from_page_title(self):
        item = self.extract(head='<meta property="og:image" content="/hero.jpg">').image_candidates[0]
        self.assertIsNone(item['siteId'])
        item = self.extract(head='<meta property="og:image" content="/hero.jpg"><meta property="og:image:alt" content="Erbil Citadel">').image_candidates[0]
        self.assertEqual(item['siteId'], SITE['id'])

    def test_license_and_credit_are_evidence_hints_not_approval(self):
        item = self.extract('<figure><img src="/photo.jpg" alt="Erbil Citadel"><figcaption>Erbil Citadel <span class="credit">Example photographer</span> <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></figcaption></figure>').image_candidates[0]
        self.assertEqual(item['license_hint'], 'CC BY 4.0')
        self.assertEqual(item['credit'], 'Example photographer')
        self.assertEqual(item['license_status'], 'unverified')

    def test_stronger_trusted_source_wins_and_input_tiers_cannot_spoof(self):
        primary = self.candidate('unesco')
        commons = self.candidate('wikimedia-commons', width=2000, height=1500)
        commons['trust_tier'] = 0
        result = select_cover([commons, primary], SITE['id'], self.registry)
        self.assertEqual(result['proposed_coverImage']['sourceId'], 'unesco')
        self.assertEqual(result['proposed_coverImage']['siteId'], SITE['id'])
        self.assertFalse(result['automatically_approved'])
        self.assertEqual(result['status'], 'proposed-unverified')

    def test_equally_ranked_images_require_manual_selection(self):
        result = select_cover([self.candidate(src='/a.jpg'), self.candidate(src='/b.jpg')], SITE['id'], self.registry)
        self.assertIsNone(result['proposed_coverImage'])
        self.assertEqual(result['status'], 'tie-needs-review')

    def test_invalid_association_metadata_cannot_pass_validation(self):
        candidate = self.candidate()
        for changes in ({'siteId': 'wrong'}, {'review_required': False}, {'license_status': 'verified'},
                        {'association_status': 'uncertain'}, {'source_url': 'file:///local'}):
            item = dict(candidate, **changes)
            with self.subTest(changes=changes), self.assertRaises((ValidationError, ValueError)):
                validate_image_association(item)

    def test_wrong_site_small_and_untrusted_images_cannot_be_cover(self):
        unknown = self.candidate()
        unknown['source_id'] = 'not-trusted'
        wrong = self.candidate()
        wrong['siteId'] = 'other'
        small = self.candidate(width=200, height=100)
        result = select_cover([unknown, wrong, small], SITE['id'], self.registry)
        self.assertIsNone(result['proposed_coverImage'])
        self.assertEqual(len(result['rejected_candidates']), 3)

    def test_spoofed_source_domain_rejected(self):
        item = self.candidate()
        item['source_url'] = 'https://example.org/pretend'
        self.assertIsNone(select_cover([item], SITE['id'], self.registry)['proposed_coverImage'])


class ImageReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.storage = Storage(self.root/'data')
        self.site = dict(SITE, coverImage=None, sources=[], source_evidence=['image-test'])
        self.raw = html('<img src="/citadel.jpg" alt="Erbil Citadel" width="1200" height="800">')
        self.path = self.storage.save_html('erbil', 'krg', 'image-test', self.raw)
        self.manifest = self.storage.evidence_json_path('erbil', 'krg', 'image-test')
        self.storage.save_json(self.manifest, {'evidence_id':'image-test', 'source_id':'krg', 'trust_tier':1,
            'final_url':'https://gov.krd/history', 'retrieved_at':'2026-10-31T10:00:00+00:00',
            'http_status':200, 'robots':{'status':'allowed'}, 'html_path':str(self.path.relative_to(self.root)), 'sha256':sha256_bytes(self.raw)})

    def run_prepare(self, site=None, refs=None):
        return prepare(site or self.site, refs or ['image-test'], EvidenceRepository(self.root/'data'), [SITE, OTHER])

    def test_review_copy_gets_unverified_cover_with_evidence_and_inputs_untouched(self):
        original = copy.deepcopy(self.site)
        result = self.run_prepare()
        self.assertEqual(result['coverImage']['siteId'], SITE['id'])
        self.assertEqual(result['coverImage']['evidenceId'], 'image-test')
        self.assertEqual(result['provenance']['coverImage'], ['image-test'])
        self.assertEqual(result['verification']['status'], 'unverified')
        self.assertEqual(self.site, original)
        self.assertEqual(self.path.read_bytes(), self.raw)

    def test_existing_cover_preserved_with_proposal_available(self):
        self.site['coverImage'] = {'src':'/existing.jpg'}
        result = self.run_prepare()
        self.assertEqual(result['coverImage'], {'src':'/existing.jpg'})
        self.assertIsNotNone(result['cover_selection']['proposed_coverImage'])

    def test_conflicting_source_observations_of_same_image_remove_site_association(self):
        shared = b'https://images.example.org/shared.jpg'
        raw = self.raw.replace(b'/citadel.jpg', shared)
        self.path.write_bytes(raw)
        manifest = json.loads(self.manifest.read_text(encoding='utf-8'))
        manifest['sha256'] = sha256_bytes(raw)
        self.storage.save_json(self.manifest, manifest)
        other_raw = raw.replace(b'alt="Erbil Citadel"', b'alt="Choli Minaret"')
        other_path = self.storage.save_html('erbil', 'unesco', 'other-source', other_raw)
        self.storage.save_json(self.storage.evidence_json_path('erbil', 'unesco', 'other-source'),
            dict(manifest, evidence_id='other-source', source_id='unesco', final_url='https://whc.unesco.org/example',
                 html_path=str(other_path.relative_to(self.root)), sha256=sha256_bytes(other_raw)))
        result = self.run_prepare(refs=['image-test', 'other-source'])
        self.assertTrue(all(item['siteId'] is None for item in result['image_candidates']))
        self.assertTrue(all(item['association_status'] == 'ambiguous' for item in result['image_candidates']))
        self.assertIsNone(result['coverImage'])
        self.assertIn('original_association', result['image_candidates'][0])

    def test_missing_or_tampered_evidence_flagged_and_no_cover(self):
        self.path.write_bytes(b'tampered')
        result = self.run_prepare(refs=['image-test', 'missing'])
        self.assertEqual(len(result['image_review']['errors']), 2)
        self.assertIsNone(result['coverImage'])

    def test_cli_separate_output_and_exit_status(self):
        path, output = self.root/'sites.json', self.root/'review.json'
        self.storage.save_json(path, [self.site, OTHER])
        before = path.read_bytes()
        with patch('prepare_images.BASE', self.root), contextlib.redirect_stdout(io.StringIO()):
            code = main([str(path), '--site-id', SITE['id'], '--output', str(output)])
        self.assertEqual(code, 0)
        self.assertTrue(output.exists())
        self.assertEqual(path.read_bytes(), before)
        with patch('prepare_images.BASE', self.root), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main([str(path), '--site-id', SITE['id'], '--output', str(path)]), 1)

    def test_cli_rejects_ambiguous_site_ids(self):
        path = self.root/'sites.json'
        self.storage.save_json(path, [self.site, self.site])
        with patch('prepare_images.BASE', self.root), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main([str(path), '--site-id', SITE['id']]), 1)


if __name__ == '__main__':
    unittest.main()
