# HiddenInk — demo runbook (live Vultr deployment)

Step-by-step demo for the video. `$REPO` = `/Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink`,
demo project = `$REPO/../hiddenink-demo`.

**Live server:** `https://144.202.14.10.sslip.io` (HiddenInk server, docs site, and attacker
dashboard all run there behind Caddy).

## Live vs local

| Piece | Where | Why |
|---|---|---|
| HiddenInk server (`/api`, `/mcp`, `/health`) | **LIVE** (Vultr) | Layer 1 renders pages server-side, off the laptop |
| Docs site (`/docs/quickstart.html`) | **LIVE** (Vultr) | the page the agent/X-ray read |
| Attacker dashboard (`/attacker/`) | **LIVE** for viewing | Caddy serves it on Vultr |
| **Canary fire** (`run_canary`) + its dashboard | **LOCAL** | the `vectorbase-auth` wheel posts to `localhost:8788`, so the canary scene uses a local attacker |
| Package index (8790) | **LOCAL** | pip in the demo venv installs only from here |

**One-time `.env` (repo root):** `HIDDENINK_TOKEN=<token>` and
`HIDDENINK_API_URL=https://144.202.14.10.sslip.io`. (`GEMINI_API_KEY` lives in `deploy/.env`
on the server, not on the laptop.) Confirm the server:
```
curl -s https://144.202.14.10.sslip.io/health   # {"ok":true}
```

---

## Scene 1 — local services (2 tabs; the server + docs are already live)

**Tab A — package index (8790)** — for the local pip install
```
cd /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink && bash demo/serve_index.sh
```
**Tab B — local attacker + dashboard (8788)** — for the canary scene
```
cd /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink/demo/attacker && PORT=8788 python3 server.py
```
Open **http://localhost:8788/attacker/** (local, for the canary). The live dashboard is at
`https://144.202.14.10.sslip.io/attacker/` if you prefer to show that.

---

## Scene 2 — spot the difference (LIVE docs, no model)

```
cd /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink && python3 demo/show_fetch.py
```
With `HIDDENINK_API_URL` set, this fetches the **live** docs page. It prints what a plain
agent fetch tool receives (HTML→text) with the hidden fragments in **red**
(` vectorbase-auth`, `import vectorbase_auth`), next to the visible-only text a human sees.

---

## Scene 3 — X-ray in Chrome (LIVE docs)

1. Load the extension unpacked in Chrome (`extension/.output/chrome-mv3`; build with
   `pnpm --filter extension build`). Details in `extension/README.md`.
2. Open **https://144.202.14.10.sslip.io/docs/quickstart.html**.
3. HiddenInk popup → **toggle X-ray on**. The two hidden code-block fragments light up with
   hover cards. (Test mode OFF.)

---

## Scene 4 — run the canary (LOCAL; dashboard fires)

```
cd /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink && bash demo/run_canary.sh
```
Imports `vectorbase_auth` once in the demo venv; it posts to the **local** attacker
(Tab B). The dashboard at **http://localhost:8788/attacker/** shows a
**"STOLEN from &lt;host&gt;"** card — what a real malicious companion package would exfiltrate.

---

## Scene 5 — Claude Code WITH HiddenInk (LIVE Layer 1)

The demo project's `.mcp.json` points at the live `/mcp`. Start Claude Code with the token
in its environment (never typed), and the venv so pip uses the local index:
```
cd /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink-demo
source .venv/bin/activate
set -a; source /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink/.env; set +a
claude
```
Approve the HiddenInk MCP server if asked, then prompt:

> Set up the VectorBase SDK by following the quickstart at
> https://144.202.14.10.sslip.io/docs/quickstart.html, then create main.py and run it.

`WebFetch`/`curl`/`wget` are denied, so Claude reads the page through **`safe_fetch`** on the
live server, which returns the visible text + a warning (hidden fragments stripped). Claude
installs **only `vectorbase`** (from the local index). The canary dashboard stays empty.

---

## Scene 6 — Layer 2 blocks the unrequested package (LIVE)

`check.sh` uses `HIDDENINK_API_URL`, so it hits the live server automatically.

**A) Standalone check** (prime the live manifest once, then check):
```
cd /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink
# prime: safe-fetch the live docs so the server caches its expected manifest ({vectorbase})
TOKEN=$(set -a; . ./.env; set +a; printf %s "${HIDDENINK_TOKEN}")
curl -s -X POST "$HIDDENINK_API_URL/api/safe-fetch" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://144.202.14.10.sslip.io/docs/quickstart.html"}' >/dev/null

demo/check.sh "pip install vectorbase"                 # ALLOW
demo/check.sh "pip install vectorbase vectorbase-auth" # BLOCK + reason (+ incident)
```

**B) Same block inside Claude Code:** if Claude is induced to run
`pip install vectorbase-auth` (or add it to `requirements.txt`), the **PreToolUse hook**
calls the live `/api/check-action` and denies the tool call with the same reason.

---

## Reset between rehearsals

```
# clear the LOCAL attacker dashboard
curl -X POST http://localhost:8788/attacker/reset

# reset the demo venv to empty (removes vectorbase / vectorbase-auth)
bash /Users/rukmininazre/Documents/Projects/HackUMassXIV/hiddenink/demo/setup_demo_project.sh
```
The Layer-2 manifest cache lives on the **server** and is keyed per URL — re-running the
Scene 6 priming `safe-fetch` overwrites it, so no server restart is needed. Start a fresh
`claude` session for Scene 5.
