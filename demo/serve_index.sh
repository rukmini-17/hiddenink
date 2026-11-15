#!/usr/bin/env bash
# Serve the PEP 503 demo package index on port 8790 (DEMO).
# pip reaches it at http://localhost:8790/simple/  (set as PIP_INDEX_URL in the demo project).
cd "$(dirname "$0")/index" && exec python3 -m http.server 8790
