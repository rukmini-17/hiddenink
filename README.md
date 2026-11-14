# HiddenInk

**The page you read and the page your AI reads aren't the same document. HiddenInk shows you the difference.**

Attackers hide instructions for AI inside web pages and PDFs (white text, 1px fonts, off-screen elements,
invisible Unicode). A person can't see them; an AI that reads the content will. HiddenInk sits with the receiver:
a Chrome extension with **X-ray mode** (see what's hidden on any page), a **paste guard** and an **upload guard**
on chatbot sites, all running locally. Built at HackUMass by Rukmini and Nisha.

| Folder | What |
|---|---|
| `core/` | Detection engine (TypeScript): web, PDF, Unicode detectors + the AI-aimed scorer. Ships as ESM and as an IIFE bundle. |
| `extension/` | Chrome (MV3) extension: X-ray, paste guard, upload guard. |
| `corpus/` | Generated attack / benign / demo test files + `manifest.json`. |
| `eval/` | Local eval: detection rate and false-alarm rate of the engine on the corpus. |
| `docs/` | `CONTRACTS.md` (shared types), `ARCHITECTURE.md` (how each detector works), `PROGRESS.md` (log). |

## Install the extension

Prebuilt output is not committed, so build once (Docker, nothing installed on the host):

```bash
extension/scripts/node-docker.sh pnpm install
extension/scripts/node-docker.sh pnpm build:core
extension/scripts/node-docker.sh pnpm --filter @hiddenink/extension build
```

Or, with Node 22 + pnpm 9 installed locally: `pnpm install && pnpm build:core && pnpm --filter @hiddenink/extension build`.

Then in Chrome: `chrome://extensions` → **Developer mode** → **Load unpacked** → `extension/.output/chrome-mv3/`
(the folder is hidden in Finder; press Cmd+Shift+. in the file picker). Turn on "Allow access to file URLs" in the
extension's details to use X-ray on local demo files.

To use X-ray on the demo page, serve it: `extension/scripts/serve-demo.sh` → <http://localhost:8787/job_listing_poisoned.html>.

Walkthrough of the demo and what to expect: `extension/docs/DEMO-RUNBOOK.md`. Build details: `extension/README.md`.

## Regenerate the test files

```bash
cd corpus && uv run generate.py
```

Needs `uv` and Google Chrome. Details and the folder layout: `corpus/README.md`.

## Run the eval

```bash
pnpm build:core                      # the eval injects core/dist/hiddenink-core.iife.js into each test item
cd eval && uv run run_local.py       # writes results/metrics_local.csv and results/summary.md
```

## Tests

```bash
pnpm test                            # core: vitest (unit in jsdom, web + PDF engines in headless Chrome)
extension/scripts/smoke/run.sh       # extension: headless end-to-end checks through the real UI
```

## Demo files

`corpus/demo/`: `job_listing_poisoned.html` (six hidden snippets), `resume_poisoned.pdf` (white 1pt line),
four clean résumés and `resume_clean.pdf`. All names and companies are fictional; payloads are harmless demonstrations.
