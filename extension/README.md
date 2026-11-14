# HiddenInk extension

Chrome (Manifest V3) extension built with [WXT](https://wxt.dev), React and Tailwind. Three features, all offline:

- **X-ray mode**: dims the page and glows the text that is hidden from you but readable by an AI.
- **Paste guard**: on chatgpt.com, chat.openai.com, gemini.google.com and claude.ai, catches hidden instructions at the moment you paste.
- **Upload guard**: on the same sites, scans PDFs before they are uploaded and shows where the hidden text is.

## Build (no Node on the host: Docker)

Everything runs inside a `node:22` container. Docker Desktop must be running.

```bash
# from the repo root
extension/scripts/node-docker.sh pnpm install                 # once, and after dependency changes
extension/scripts/node-docker.sh pnpm build:core              # core must be built first (extension imports core/dist)
extension/scripts/node-docker.sh pnpm --filter @hiddenink/extension build
extension/scripts/node-docker.sh pnpm --filter @hiddenink/extension typecheck
```

Output lands in `extension/.output/chrome-mv3/`. Note that `node_modules` is installed for Linux inside the
container; if you ever install Node on the host, delete `node_modules` and re-install.

## Install unpacked

1. Chrome → `chrome://extensions` → turn on **Developer mode**.
2. **Load unpacked** → pick `extension/.output/chrome-mv3/`.
3. After each rebuild, press the reload icon on the HiddenInk card and reload the tab you are testing on.

## Test mode

Until the detection engine returns real findings, turn on **Test mode** in the extension's settings
(popup → Settings). It fakes findings so the whole flow can be exercised:

- every PDF upload on a chatbot site opens the upload guard, even for a clean PDF (with a sample box on the page preview);
- every paste of 40+ characters opens the paste guard;
- X-ray highlights the first two paragraphs of any page.

Turn it off for real use.

## Layout

```
entrypoints/
  background.ts            toolbar badge count
  popup/                   X-ray toggle, finding count, Inky
  options/                 settings: serverUrl (Stage 2), test mode
  xray.content/            X-ray overlay (all URLs; idle until the popup toggles it)
  guards.content/          paste guard + upload guard (chatbot sites, document_start)
lib/
  intercept.ts, replay.ts  N0: capture-phase interception and synthetic re-send of uploads/pastes
  scan.ts, testMode.ts     wrappers around @hiddenink/core, plus fake findings for test mode
  pdfPreview.ts            renders flagged PDF pages to JPEG previews with pdf.js (same instance as core)
  explain.ts               plain-language template text per technique (Gemini text comes in Stage 2)
  remote.ts, settings.ts   RemoteLayers no-op stub + serverUrl setting (Stage 2 hooks)
  shadowHost.ts            React root inside a Shadow DOM
components/                Inky, FindingCard, Modal, PdfPreview
```

See `docs/N0-upload-spike.md` for how upload interception works and what still needs checking on each site.
