import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

import api


CONFIG = dict(zip(api.KEYS, ("http://komodo.example:9120", "test-key", "test-secret")))


class CredentialsTests(unittest.TestCase):
    def test_environment_needs_no_file_or_container(self):
        with patch.object(Path, "exists", side_effect=AssertionError("Must not inspect files")):
            self.assertEqual(api.credentials(CONFIG), CONFIG)

    def test_owner_only_file_and_environment_override(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "credentials.json"
            path.write_text(json.dumps(CONFIG))
            path.chmod(0o600)
            result = api.credentials({"KOMODO_CREDENTIALS_FILE": str(path), "KOMODO_ADDRESS": "https://other.example"})
            self.assertEqual(result, CONFIG | {"KOMODO_ADDRESS": "https://other.example"})
            path.chmod(0o644)
            with self.assertRaisesRegex(ValueError, "owner-only"):
                api.credentials({"KOMODO_CREDENTIALS_FILE": str(path)})

    def test_missing_credentials_reports_names_not_values(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "Missing credentials: KOMODO_ADDRESS, KOMODO_API_KEY, KOMODO_API_SECRET"):
                api.credentials({"KOMODO_CREDENTIALS_FILE": str(Path(directory) / "absent")})

    def test_unsafe_addresses_rejected(self):
        for address in ("file:///etc/passwd", "http://key:secret@example.com", "https://example.com?secret=value"):
            with self.subTest(address=address), self.assertRaises(ValueError):
                api.credentials(CONFIG | {"KOMODO_ADDRESS": address})


class ClientTests(unittest.TestCase):
    def test_request_envelope_headers_and_timeout(self):
        with patch("api.urllib.request.build_opener") as build:
            opener = build.return_value
            opener.open.return_value.__enter__.return_value = io.StringIO('{"ok":true}')
            self.assertEqual(api.call("read", "GetStack", {"stack": "test"}, CONFIG), {"ok": True})
            request = opener.open.call_args.args[0]
            self.assertEqual(request.full_url, "http://komodo.example:9120/read")
            self.assertEqual(json.loads(request.data), {"type": "GetStack", "params": {"stack": "test"}})
            self.assertEqual(request.get_header("X-api-key"), "test-key")
            self.assertEqual(request.get_header("X-api-secret"), "test-secret")
            self.assertEqual(opener.open.call_args.kwargs, {"timeout": 60})
            self.assertIsInstance(build.call_args.args[0], api.NoRedirect)

    def test_redirects_do_not_forward_credentials(self):
        self.assertIsNone(api.NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.example"))

    def test_errors_hide_response_body_and_do_not_retry_mutations(self):
        error = urllib.error.HTTPError("http://example", 403, "secret diagnostic", {}, io.BytesIO(b"secret response"))
        with patch.dict(os.environ, CONFIG, clear=True), patch("sys.argv", ["api.py", "execute", "RunAction"]), patch("api.call", side_effect=error) as call, contextlib.redirect_stderr(io.StringIO()) as output:
            self.assertEqual(api.main(), 1)
            self.assertIn("HTTP 403", output.getvalue())
            self.assertNotIn("secret diagnostic", output.getvalue())
            self.assertNotIn("secret response", output.getvalue())
            call.assert_called_once()

    def test_non_object_params_fail_before_request(self):
        with patch("sys.argv", ["api.py", "read", "ListStacks", "[]"]), patch("api.call") as call, contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(api.main(), 1)
            call.assert_not_called()


if __name__ == "__main__":
    unittest.main()
