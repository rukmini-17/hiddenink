#!/usr/bin/env bash
# N6 control run: every corpus item through the extension (X-ray for HTML, upload guard for PDF), headless, Docker only.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
docker run --rm --ipc=host \
  -v "$ROOT/extension/.output/chrome-mv3":/ext:ro \
  -v "$ROOT/corpus":/corpus:ro \
  -v "$ROOT/extension/scripts/smoke":/smoke \
  -w /smoke mcr.microsoft.com/playwright:v1.52.0-noble \
  bash -c 'npm install --silent >/dev/null 2>&1; node corpus.mjs /ext /corpus'
