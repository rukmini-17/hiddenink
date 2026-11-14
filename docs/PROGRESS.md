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

## Nisha
