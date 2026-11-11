import unittest

from hb_pipeline.utils import host_matches, slugify


class UtilsTests(unittest.TestCase):
    def test_exact_domain_match(self):
        self.assertTrue(host_matches("whc.unesco.org", ["whc.unesco.org"]))

    def test_subdomain_match(self):
        self.assertTrue(host_matches("media.whc.unesco.org", ["unesco.org"]))

    def test_malicious_suffix_does_not_match(self):
        self.assertFalse(host_matches("whc.unesco.org.example.com", ["whc.unesco.org"]))

    def test_slugify(self):
        self.assertEqual(slugify("Erbil Citadel"), "erbil-citadel")


if __name__ == "__main__":
    unittest.main()
