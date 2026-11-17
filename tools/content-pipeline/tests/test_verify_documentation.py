import json
import subprocess
import unittest

import verify_documentation as vd


def curl(returncode, status, body=b''):
    """Fake `curl -w '\\n%{http_code}'` output: body, newline, three-digit status."""
    def run(*_args, **_kwargs):
        return subprocess.CompletedProcess([], returncode, stdout=body + b'\n' + status.encode(), stderr=b'')
    return run


class FetchModelTests(unittest.TestCase):
    def fetch(self, run):
        return vd.fetch_model('abc123', run=run, sleep=lambda _seconds: None)

    def test_public_model_returns_the_api_payload(self):
        payload = {'name': 'Temple', 'user': {'username': 'team'}}
        self.assertEqual(self.fetch(curl(0, '200', json.dumps(payload).encode())), ('public', payload))

    def test_only_http_404_confirms_a_missing_model(self):
        self.assertEqual(self.fetch(curl(0, '404')), ('missing', 'HTTP 404'))

    def test_rate_limits_and_server_errors_are_inconclusive(self):
        for status in ('429', '403', '500', '503'):
            with self.subTest(status=status):
                self.assertEqual(self.fetch(curl(0, status)), ('unknown', f'HTTP {status}'))

    def test_timeouts_and_connection_failures_are_inconclusive(self):
        self.assertEqual(self.fetch(curl(28, '000')), ('unknown', 'curl exit 28 (no HTTP response)'))
        self.assertEqual(self.fetch(curl(6, '000')), ('unknown', 'curl exit 6 (no HTTP response)'))

    def test_unreadable_payload_is_inconclusive(self):
        self.assertEqual(self.fetch(curl(0, '200', b'<html>')), ('unknown', 'unreadable API response'))

    def test_a_transient_failure_is_retried_before_giving_up(self):
        responses = iter([curl(28, '000'), curl(0, '429'), curl(0, '200', b'{"name": "x"}')])
        self.assertEqual(self.fetch(lambda *a, **k: next(responses)(*a, **k)), ('public', {'name': 'x'}))


if __name__ == '__main__':
    unittest.main()
