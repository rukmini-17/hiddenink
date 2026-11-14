#!/usr/bin/env bash
# Start the DEMO attacker collector in Docker: http://localhost:8788/attacker/  (Ctrl+C to stop)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
docker run --rm -it -p 8788:8788 -v "$DIR":/app:ro -w /app python:3.12-alpine python -u server.py
