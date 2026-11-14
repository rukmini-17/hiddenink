# HiddenInk architecture

How each detector works and its known limitations. Kept short so the team can explain it to judges.

## Packages

- `core/`: detection engine (pure TypeScript). Ships as ESM for the extension and as an IIFE bundle
  (`window.HiddenInk`) for injection into arbitrary pages (eval runner, Stage 2 server).
- `extension/`: WXT Chrome extension (X-ray, paste guard, upload guard).
- `corpus/`: generated attack and benign test items + `manifest.json`.
- `eval/`: Playwright runner that measures detection and false-alarm rates.

## Detectors

_To be filled in as R1–R4 land._

- Web (R1):
- Unicode (R2):
- AI-aimed scorer (R3):
- PDF (R4):
