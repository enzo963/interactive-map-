import unittest

from hb_pipeline.config import SourceRegistry


class RegistryTests(unittest.TestCase):
    def test_registry_loads_expected_sources(self):
        registry = SourceRegistry()
        ids = {source.id for source in registry.all()}
        self.assertIn("unesco", ids)
        self.assertIn("krg", ids)
        self.assertIn("iraqi-antiquities", ids)
        self.assertIn("wikimedia-commons", ids)


if __name__ == "__main__":
    unittest.main()
