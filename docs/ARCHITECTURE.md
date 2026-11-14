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
- Unicode (R2): `core/src/unicode/`. `segment.ts` splits text into visible stretches and invisible runs and
  decides which runs are legitimate; `scanUnicode` reports the rest and `cleanText` drops them. Both use the
  same segmentation, so they never disagree. Thresholds live in `limits.ts`.
  - `unicode_tags` (U+E0000–E007F): decoded to ASCII. Flagged if the decoded text is readable.
    Exception: U+1F3F4 + 2–6 tag letters/digits + cancel tag = subdivision flag (England, Scotland, Wales).
  - `zero_width` (U+200B–200D, U+2060, U+FEFF): flagged when ≥3 in a row, or ≥8 scattered through one text.
    Two-symbol runs are tried as binary (8 bits/char) and decoded if readable. Not flagged: one leading BOM,
    a ZWJ inside an emoji sequence, a lone ZWJ/ZWNJ between non-Latin letters (Persian, Hindi…).
  - `bidi` (U+202A–202E, U+2066–2069): every run is reported; only overrides (U+202D/202E) are flagged,
    because isolates and embeddings appear in normal right-to-left text and in chat apps around usernames.
  - `variation_selectors` (U+FE00–FE0F, U+E0100–E01EF): runs of ≥3 are flagged and decoded as bytes
    ("emoji smuggling"). A single selector after an emoji is normal.
  - Limitations: lone ZWJ/ZWNJ between Latin letters only count toward the "scattered" total; other
    invisible characters (e.g. U+180E, U+2061–2064 invisible math operators) aren't covered yet.
- AI-aimed scorer (R3):
- PDF (R4):
