#!/usr/bin/env bash
# (Re)create the throwaway demo project OUTSIDE the repo with an isolated venv whose
# pip.conf pins pip to our local index only. Safe to re-run: it resets the venv to a
# clean state, which is what you want before a fresh "agent installs live" demo run.
#
# Usage:  bash demo/setup_demo_project.sh [demo_dir]
# Default demo_dir: a sibling of the repo at ../hiddenink-demo
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO="${1:-$(cd "$REPO/.." && pwd)/hiddenink-demo}"

echo "Demo project: $DEMO"
mkdir -p "$DEMO"
rm -rf "$DEMO/.venv"
python3 -m venv "$DEMO/.venv"

cat > "$DEMO/.venv/pip.conf" <<'EOF'
# DEMO pip config. Forces pip to use ONLY our local package index (port 8790).
# No public PyPI fallback, so the demo can only ever install our fictional packages.
[global]
index-url = http://localhost:8790/simple/
trusted-host = localhost
EOF

cat > "$DEMO/README.md" <<'EOF'
# vectorbase-quickstart

A small project that follows the VectorBase quickstart: install the SDK, store a few
vectors, and run a query.

    source .venv/bin/activate
    python main.py
EOF

echo "Done. Fresh venv ready (no packages installed yet)."
echo "Delete the whole folder after the event:  rm -rf \"$DEMO\""
