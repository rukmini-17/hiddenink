#!/usr/bin/env bash
# Regenerate extension/public/icon/*.png from extension/assets/icon/*.svg.
# Uses the headless Chromium inside the Playwright Docker image (already used by the smoke tests), so
# nothing is installed on the host. 16 px uses the glyph-only SVG (the tile gets muddy that small).
set -euo pipefail
EXT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
docker run --rm -v "$EXT/assets/icon":/src:ro -v "$EXT/public/icon":/out mcr.microsoft.com/playwright:v1.52.0-noble bash -c '
  set -e
  SHELL_BIN=$(ls -d /ms-playwright/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
  for spec in 16:glyph 32:icon 48:icon 128:icon; do
    size=${spec%%:*}; src=${spec##*:}
    sed -E "s/width=\"28\" height=\"28\"/width=\"$size\" height=\"$size\"/" /src/$src.svg > /tmp/$size.svg
    "$SHELL_BIN" --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
      --default-background-color=00000000 --window-size="$size,$size" --screenshot=/out/$size.png file:///tmp/$size.svg >/dev/null 2>&1
    echo "wrote $size.png"
  done'
