# @hiddenink/server — Layer 1 (safe-fetch) + MCP

Node + TypeScript. Renders a URL in headless Chrome, runs the core engine (injected as the
built IIFE), and returns only the human-visible text plus a warning. The agent never sees
hidden instructions.

## Endpoints

- `GET /health` → `{ ok: true }` (no auth)
- `POST /api/safe-fetch` (Bearer auth) — body `{ url }` →
  `{ url, visibleText, findings: [{technique, text, location}], removedCount, manifest, warning }`.
  `manifest` is `{packages:[],commands:[]}` until R3 fills it with Gemini. `/api/check-action`
  is added in R3.
- `/mcp` — MCP Streamable HTTP; tool `safe_fetch(url)` returns the warning then the visible text.

Auth: `Authorization: Bearer $HIDDENINK_API_KEY`. If the key is empty the server runs
unauthenticated and warns (dev only).

## Run

```bash
pnpm build:core                       # ensure core/dist/hiddenink-core.iife.js exists
HIDDENINK_API_KEY=dev-key pnpm --filter @hiddenink/server start    # :8787
```

Uses the installed Google Chrome (`channel: "chrome"`); set `PW_BUNDLED_CHROMIUM=1` to use
Playwright's own Chromium instead.

## Smoke test

With the server on :8787 and the docs site on :8791
(`cd demo/site && python3 -m http.server 8791`):

```bash
HIDDENINK_API_KEY=dev-key node server/scripts/smoke.mjs
```

Asserts `/health`, ≥1 finding, a non-empty warning, and that `visibleText` does not contain
the hidden `vectorbase-auth` payload.
