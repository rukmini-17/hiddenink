#!/usr/bin/env bash
# Serve corpus/demo over http://localhost:8787 (Docker only), so X-ray works on the demo page without
# enabling "Allow access to file URLs". Ctrl+C to stop.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "Demo page: http://localhost:8787/job_listing_poisoned.html"
docker run --rm -it -p 8787:8000 -v "$ROOT/corpus/demo":/srv:ro -w /srv python:3.12-alpine python -m http.server 8000
