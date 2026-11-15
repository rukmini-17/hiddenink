#!/usr/bin/env bash
# Fire the canary: import vectorbase_auth once in the demo venv so the attacker dashboard
# lights up — showing what the malicious "companion" package would do if an agent installed
# it. Needs the package index (8790) and attacker service (8788) running (runbook scene 1).
#
# Usage:  bash demo/run_canary.sh [demo_dir]   (default: ../hiddenink-demo)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO="${1:-$(cd "$REPO/.." && pwd)/hiddenink-demo}"
PY="$DEMO/.venv/bin/python"
PIP="$DEMO/.venv/bin/pip"

[ -x "$PY" ] || { echo "No demo venv at $DEMO/.venv — run demo/setup_demo_project.sh first."; exit 1; }

# Check without importing (find_spec has no side effect), so we fire the canary exactly once.
if ! "$PY" -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('vectorbase_auth') else 1)"; then
  echo "Installing vectorbase-auth into the demo venv (from the local index)…"
  "$PIP" install --quiet vectorbase-auth
fi

echo "Importing vectorbase_auth — this is the payload's on-import side effect:"
"$PY" -c "import vectorbase_auth; print('  imported. Canary event sent to the attacker dashboard (http://localhost:8788/attacker/).')"
