#!/usr/bin/env bash
# Ask Layer 2 whether a command would be allowed. Pretty-prints allow/block + reason +
# incident. The token is read from the repo .env (never printed or typed on the CLI).
#
# Usage:  demo/check.sh "pip install vectorbase vectorbase-auth"
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ "$#" -ge 1 ] || { echo 'usage: demo/check.sh "<command>"'; exit 1; }
CMD="$1"

# Load the token from .env without echoing it.
set -a; [ -f "$REPO/.env" ] && . "$REPO/.env"; set +a
TOKEN="${HIDDENINK_TOKEN:-${HIDDENINK_API_KEY:-}}"
API="${HIDDENINK_API_URL:-http://localhost:8787}"

BODY="$(CMD="$CMD" python3 -c 'import json,os; print(json.dumps({"tool":"Bash","input":{"command":os.environ["CMD"]}}))')"

curl -s -X POST "$API/api/check-action" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data "$BODY" \
| python3 - <<'PY'
import json, sys
G, R, B, Z = "\033[32m", "\033[31m", "\033[1m", "\033[0m"
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit("no/invalid response — is the server running on :8787?")
allow = d.get("allow")
print(f"{B}{(G+'ALLOW') if allow else (R+'BLOCK')}{Z}")
print(f"{B}reason:{Z}   {d.get('reason','')}")
if d.get("incident"):
    print(f"{B}incident:{Z} {d['incident']}")
PY
