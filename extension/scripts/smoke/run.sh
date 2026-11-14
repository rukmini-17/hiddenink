#!/usr/bin/env bash
# Headless end-to-end smoke test of the built extension (Docker only, nothing installed on the host).
# Loads extension/.output/chrome-mv3 into Chromium, fakes chatgpt.com, and exercises X-ray, paste guard
# and upload guard in test mode. Build the extension first.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
docker run --rm --ipc=host \
  -v "$ROOT/extension/.output/chrome-mv3":/ext:ro \
  -v "$ROOT/extension/scripts/smoke":/smoke \
  -w /smoke mcr.microsoft.com/playwright:v1.52.0-noble \
  bash -c 'npm install --silent >/dev/null 2>&1; node smoke.mjs /ext /smoke/sample.pdf'
