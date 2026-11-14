#!/usr/bin/env bash
# Serve the demo pages over http://localhost:8791 (Docker only), so X-ray works on them without
# enabling "Allow access to file URLs". Ctrl+C to stop.
#   corpus/demo  -> http://localhost:8791/          (job listing)
#   demo/site    -> http://localhost:8791/docs/     (VectorBase docs, same path as on the server)
# Port 8791 because 8787, 8788 and 8790 belong to the HiddenInk server, attacker and package index.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOUNTS=(-v "$ROOT/corpus/demo":/srv:ro)
if [ -d "$ROOT/demo/site" ]; then MOUNTS+=(-v "$ROOT/demo/site":/srv/docs:ro); fi
echo "Job listing: http://localhost:8791/job_listing_poisoned.html"
[ -d "$ROOT/demo/site" ] && echo "Docs site:   http://localhost:8791/docs/quickstart.html"
docker run --rm -it -p 8791:8000 "${MOUNTS[@]}" -w /srv python:3.12-alpine python -m http.server 8000
