import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("runtime_secrets_test_subject", Path(__file__).parents[1] / "runtime_secrets.py")
secrets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(secrets)


class RuntimeSecretsTests(unittest.TestCase):
    def test_protected_generation_and_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); root.chmod(0o750)
            generation = root / "g-abcdef"; generation.mkdir(mode=0o750)
            path = generation / "CONFIG_JSON"; path.write_text('{"fixture":"synthetic-only"}'); path.chmod(0o640)
            (root / "current").symlink_to(generation.name)
            self.assertIn("synthetic-only", secrets.read_generation_file(tmp, "CONFIG_JSON", os.getuid()))
            path.chmod(0o644)
            with self.assertRaisesRegex(RuntimeError, "^RUNTIME_SECRET_UNAVAILABLE$"):
                secrets.read_generation_file(tmp, "CONFIG_JSON", os.getuid())
            path.unlink(); path.symlink_to("/etc/passwd")
            with self.assertRaises(RuntimeError):
                secrets.read_generation_file(tmp, "CONFIG_JSON", os.getuid())

    def test_missing_mount_never_uses_legacy_env(self):
        with patch.dict(os.environ, {"FLIGHT_SECRET_DIRECTORY": "/nonexistent", "DATABASE_URL": "secret-env-fixture"}):
            with self.assertRaisesRegex(RuntimeError, "^RUNTIME_SECRET_UNAVAILABLE$"):
                secrets.database_url()

    def test_complete_generation_is_cached_not_environment(self):
        values = dict.fromkeys(secrets.NAMES, "synthetic-only")
        secrets.read_runtime.cache_clear()
        with patch.object(secrets, "read_generation_file", return_value=json.dumps(values)) as read:
            with patch.dict(os.environ, {"FLIGHT_SECRET_DIRECTORY": "/fixture"}):
                self.assertEqual(secrets.secret_value("SECRET_KEY"), "synthetic-only")
                self.assertEqual(secrets.secret_value("SMTP_PASSWORD"), "synthetic-only")
                self.assertEqual(read.call_count, 1)
        secrets.read_runtime.cache_clear()

    def test_production_database_and_migration_require_explicit_configuration(self):
        with patch.dict(os.environ, {"ENV": "production"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "DATABASE_CONFIGURATION_REQUIRED"):
                secrets.database_url()
        with patch.dict(os.environ, {"FLIGHT_SECRET_DIRECTORY": "/runtime", "FLIGHT_MIGRATION_SECRET_DIRECTORY": "/migration"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "MIGRATION_SECRET_REQUIRED"):
                secrets.database_url()


if __name__ == "__main__":
    unittest.main()
