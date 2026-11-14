#!/usr/bin/env bash
# Run any pnpm/node command inside a Node 22 container, so nothing is installed on the host.
# Usage (from anywhere):  extension/scripts/node-docker.sh pnpm install
#                         extension/scripts/node-docker.sh pnpm --filter @hiddenink/extension build
# The repo root is mounted at /work; the pnpm download cache lives in a named Docker volume.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
docker volume create hiddenink-pnpm-store >/dev/null
docker run --rm -it \
  -v "$ROOT":/work \
  -v hiddenink-pnpm-store:/pnpm-store \
  -w /work \
  -e npm_config_store_dir=/pnpm-store \
  -e CI=1 \
  node:22 bash -c 'corepack enable >/dev/null && corepack prepare pnpm@9.15.0 --activate >/dev/null && exec "$@"' -- "$@"
