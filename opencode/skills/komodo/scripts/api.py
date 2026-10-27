#!/usr/bin/env python3
"""Komodo envelope API client. Credentials belong to the caller, not a container."""

import argparse
import json
import os
from pathlib import Path
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request


KEYS = ("KOMODO_ADDRESS", "KOMODO_API_KEY", "KOMODO_API_SECRET")


def credentials(environ):
    values = {key: environ.get(key, "") for key in KEYS}
    if not all(values.values()):
        path = Path(environ.get("KOMODO_CREDENTIALS_FILE", "~/.config/komodo/credentials.json")).expanduser()
        if path.exists():
            with path.open() as handle:
                info = os.fstat(handle.fileno())
                if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
                    raise ValueError("Credential file must be an owner-only regular file (mode 600)")
                stored = json.load(handle)
            if not isinstance(stored, dict):
                raise ValueError("Credential file must contain a JSON object")
            values = {key: values[key] or stored.get(key, "") for key in KEYS}
    missing = [key for key in KEYS if not isinstance(values[key], str) or not values[key].strip()]
    if missing:
        raise ValueError("Missing credentials: " + ", ".join(missing) + ". Configure environment variables or an owner-only Komodo credential file.")
    address = urllib.parse.urlsplit(values["KOMODO_ADDRESS"])
    if address.scheme not in ("http", "https") or not address.hostname or address.username or address.password or address.query or address.fragment:
        raise ValueError("KOMODO_ADDRESS must be an HTTP(S) base URL without embedded credentials, query, or fragment")
    return values


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def call(kind, operation, params, config):
    request = urllib.request.Request(
        config["KOMODO_ADDRESS"].rstrip("/") + "/" + kind,
        data=json.dumps({"type": operation, "params": params}).encode(),
        headers={"Content-Type": "application/json", "X-Api-Key": config["KOMODO_API_KEY"], "X-Api-Secret": config["KOMODO_API_SECRET"]},
    )
    # Do not forward credential headers to redirected endpoints or retry mutations.
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=60) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=("read", "write", "execute"))
    parser.add_argument("operation")
    parser.add_argument("params", nargs="?", default="{}", help="JSON object. Never pass credentials here.")
    args = parser.parse_args()
    try:
        params = json.loads(args.params)
        if not isinstance(params, dict):
            raise ValueError("Params must be a JSON object")
        result = call(args.kind, args.operation, params, credentials(os.environ))
        print(json.dumps(result))
        return 0
    except urllib.error.HTTPError as error:
        print(f"Komodo API returned HTTP {error.code}; response body withheld because it can contain secrets.", file=sys.stderr)
    except (urllib.error.URLError, TimeoutError):
        print("Komodo API connection failed or timed out; request was not retried.", file=sys.stderr)
    except json.JSONDecodeError:
        print("Invalid JSON in params, credential file, or API response.", file=sys.stderr)
    except ValueError as error:
        # These errors describe validation rules, never credential values.
        print(str(error), file=sys.stderr)
    except OSError:
        print("Cannot access Komodo credentials or transport; check file permissions and connectivity.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
