"""Classification rules of the resource repair queue (check_resources.py). No network access."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import check_resources as cr  # noqa: E402


def result(code, final='https://example.org/page', ctype='text/html', redirects=0, permanent=False, curl=0):
    return {'code': code, 'final': final, 'type': ctype, 'redirects': redirects, 'permanent': permanent, 'curl': curl}


URL = 'https://example.org/page'


class Classify(unittest.TestCase):
    def test_working_links(self):
        self.assertIsNone(cr.classify(URL, result(200)))
        self.assertIsNone(cr.classify(URL, result(206)))
        self.assertIsNone(cr.classify('https://upload.example/a.jpg', result(200, ctype='image/jpeg'), expect_image=True))

    def test_dead_links(self):
        self.assertEqual(cr.classify(URL, result(404)), 'link-dead')
        self.assertEqual(cr.classify(URL, result(410)), 'link-dead')
        self.assertEqual(cr.classify('https://upload.example/a.jpg', result(404), expect_image=True), 'image-dead')
        self.assertEqual(cr.classify(URL, result(0, curl=6)), 'host-unreachable')
        self.assertEqual(cr.classify(URL, result(0, curl=60)), 'certificate-error')
        self.assertEqual(cr.classify(URL, result(0, curl=56)), 'connection-reset')

    def test_blocks_and_timeouts_go_to_a_person(self):
        for code in (401, 403, 429):
            self.assertEqual(cr.classify(URL, result(code)), 'blocked')
            self.assertEqual(cr.PRIORITY['blocked'], 'P3')
        self.assertEqual(cr.classify(URL, result(0, curl=28)), 'timeout')
        self.assertEqual(cr.classify(URL, result(503)), 'server-error')

    def test_soft_404_and_moves(self):
        self.assertEqual(cr.classify('https://example.org/a/b', result(200, final='https://example.org/', redirects=1)), 'soft-404')
        self.assertEqual(cr.classify('https://example.org/a/b', result(200, final='https://example.org/404.html', redirects=1)), 'soft-404')
        self.assertEqual(cr.classify(URL, result(200, final='https://new.example/page', redirects=1, permanent=True)), 'moved')
        self.assertIsNone(cr.classify('http://example.org/page', result(200, final='https://example.org/page', redirects=1, permanent=True)))
        self.assertIsNone(cr.classify('https://doi.org/10.1/x', result(200, final='https://publisher.example/x', redirects=1, permanent=True)),
                          'a DOI resolves to its publisher by design')
        self.assertIsNone(cr.classify('https://wmf.org/x', result(200, final='https://www.wmf.org/x', redirects=1, permanent=True)),
                          'adding www is not a move')

    def test_an_image_url_must_answer_with_an_image(self):
        self.assertEqual(cr.classify('https://upload.example/a.jpg', result(200, ctype='text/html'), expect_image=True), 'not-an-image')

    def test_url_syntax(self):
        self.assertTrue(cr.valid_url('https://example.org/a?b=1'))
        for bad in ('', 'example.org/a', 'ftp://example.org', 'https://exa mple.org', 'javascript:alert(1)'):
            self.assertFalse(cr.valid_url(bad), bad)

    def test_every_problem_has_a_priority_and_an_action(self):
        self.assertEqual(set(cr.PRIORITY), set(cr.ACTIONS))
        self.assertTrue(set(cr.PRIORITY.values()) <= {'P1', 'P2', 'P3'})


class LocalFiles(unittest.TestCase):
    def test_an_image_without_renditions_is_reported(self):
        self.assertEqual(cr.check_renditions({'variants': None})[0][0], 'no-renditions')

    def test_a_wrong_base_path_is_reported(self):
        self.assertEqual(cr.check_renditions({'variants': {'base': 'images/x'}})[0][0], 'bad-path')

    def test_a_missing_rendition_is_reported(self):
        problems = cr.check_renditions({'variants': {'base': '/images/sites/no-such-site/0123456789', 'webp': [320]}})
        self.assertEqual(problems[0][0], 'missing-file')


if __name__ == '__main__':
    unittest.main()
