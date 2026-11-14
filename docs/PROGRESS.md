# Progress log

Append-only. Write 2–4 lines under your own heading after each task.

## Rukmini

- **R0 done:** pnpm workspace (`core`, `extension`), `.gitignore`, `.env.example`, `core/src/types.ts`,
  `docs/CONTRACTS.md`. All `core` functions are stubs that return no findings, so the extension can
  integrate now. Build with `pnpm build:core` (ESM + `dist/hiddenink-core.iife.js`).
- **R2 done:** `scanText` and `cleanText` are real now (code in `core/src/unicode/`). They detect Unicode tags (decoded),
  zero-width runs/scatter (binary messages decoded), bidi overrides, and variation-selector smuggling (decoded).
  Flag emoji, emoji ZWJ, single emoji selectors and Persian/Indic ZWNJ are left alone. **Nisha:** paste guard can
  use `scanText(text).visibleText` for "Paste clean". `aiScore` is 0 until R3; use `flagged` for now.
- **R1 done** (branch `rukmini/r1-web-engine`): `scanDocument` detects all 8 web techniques with the sr-only,
  short-menu, background-image and `<select>` exceptions. `scanClipboardHtml` also works now (inline styles only).
  A **first R3 scorer** is in (`core/src/scorer/config.ts`), so `aiScore` and `reasons` are real everywhere.
  **Nisha:** show only `flagged` findings. Web `bbox` is `[x, y, w, h]` in document CSS px (not viewport), and
  `selector` works with `querySelector`. For paste guard, run both `scanText` and `scanClipboardHtml` and use the
  HTML one's `visibleText` when it has findings. Web tests run in installed Chrome (`pnpm test`).
- **R4 done** (branch `rukmini/r4-pdf-engine`): `scanPdf` detects `pdf_invisible` (render-and-sample: white text,
  invisible mode, covered/redacted text), `pdf_tiny_font` and `pdf_offpage`, plus Unicode tricks. It skips OCR layers
  and tiny page numbers/footers. Same flag rule as the web. bbox format is now in `docs/CONTRACTS.md`.
  **Nisha:** `await scanPdf(fileBytes)` needs no worker setup; call it from the content script, not the
  service worker. Your buffer isn't detached, so you can re-send it. Draw boxes at `bbox × renderScale` on page
  `location.page` (1-indexed). pdf.js loads lazily (~2.3 MB) the first time `scanPdf` is called.

## Nisha
