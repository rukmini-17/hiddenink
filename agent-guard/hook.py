#!/usr/bin/env python3
"""HiddenInk PreToolUse hook for Claude Code (Layer 2).

Claude Code sends the pending tool call as JSON on stdin. This hook forwards the tool and
its input to the HiddenInk server's /api/check-action and, if the server says the action
installs a package the documentation never justified, DENIES it with a clear reason.

Verified against the current Claude Code hooks docs: block via stdout JSON
  {"hookSpecificOutput": {"hookEventName": "PreToolUse",
                          "permissionDecision": "deny",
                          "permissionDecisionReason": "..."}}
and exit 0. Any error here fails OPEN (allow), so the hook can't break the session.

Env: HIDDENINK_API_URL (default http://localhost:8787), HIDDENINK_API_KEY or HIDDENINK_TOKEN.
"""
import json
import os
import sys
import urllib.request

API = os.environ.get("HIDDENINK_API_URL", "http://localhost:8787").rstrip("/")
KEY = os.environ.get("HIDDENINK_API_KEY") or os.environ.get("HIDDENINK_TOKEN") or ""
CHECKED_TOOLS = {"Bash", "Edit", "Write"}


def allow() -> None:
    # Emitting nothing + exit 0 lets the action proceed.
    sys.exit(0)


def deny(reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except Exception:
        allow()
    tool = event.get("tool_name", "")
    if tool not in CHECKED_TOOLS:
        allow()
    payload = json.dumps({"tool": tool, "input": event.get("tool_input", {})}).encode()
    headers = {"Content-Type": "application/json"}
    if KEY:
        headers["Authorization"] = f"Bearer {KEY}"
    try:
        req = urllib.request.Request(f"{API}/api/check-action", data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.load(resp)
    except Exception:
        allow()  # server down / error: fail open
    if result.get("allow", True):
        allow()
    reason = result.get("reason", "Blocked by HiddenInk.")
    incident = result.get("incident")
    if incident:
        reason = f"{reason}\n\nIncident report:\n{incident}"
    deny(reason)


if __name__ == "__main__":
    main()
