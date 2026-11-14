# HiddenInk shared contracts

Source of truth for types is `core/src/types.ts`. **Ask your teammate before changing either file.**

## Types

```ts
export type Technique =
  // web
  | "low_contrast" | "tiny_font" | "transparent" | "offscreen" | "clipped"
  | "display_none" | "attr_text" | "html_comment"
  // unicode (web, paste, PDF)
  | "unicode_tags" | "zero_width" | "bidi" | "variation_selectors"
  // pdf
  | "pdf_invisible" | "pdf_tiny_font" | "pdf_offpage";

export type Finding = {
  id: string;
  technique: Technique;
  text: string;            // raw hidden text
  decoded?: string;        // e.g. Unicode Tags decoded into readable ASCII
  location: { selector?: string; page?: number; bbox?: [number, number, number, number] };
  aiScore: number;         // 0–1: "is this aimed at an AI?"
  flagged: boolean;        // aiScore >= threshold, or a technique that is suspicious on its own
  reasons: string[];       // human-readable
};

export type ScanResult = {
  findings: Finding[];
  visibleText: string;     // what a human would see
};

export type ScanOptions = {
  threshold?: number;      // default 0.5
};
```

## Public API (`@hiddenink/core`)

```ts
scanDocument(doc: Document, opts?: ScanOptions): ScanResult
scanText(text: string, opts?: ScanOptions): ScanResult           // paste guard (plain text)
scanClipboardHtml(html: string, opts?: ScanOptions): ScanResult   // paste guard (HTML; inline styles only)
scanPdf(data: ArrayBuffer, opts?: ScanOptions): Promise<ScanResult>
cleanText(text: string): string                                   // strips invisible Unicode
```

- ESM: `import { scanPdf } from "@hiddenink/core"` (workspace dependency).
- IIFE: `core/dist/hiddenink-core.iife.js` defines `window.HiddenInk` with the same functions.
- Build with `pnpm build:core`.
- **Status:** all functions are stubs that return no findings (R0). Real detectors land incrementally;
  progress is logged in `docs/PROGRESS.md`.

### `location.bbox` format

Always `[x, y, width, height]`, origin at the **top-left**, y grows downward.

| Source | Coordinate space |
|---|---|
| Web (`scanDocument`) | Page CSS px, origin = top-left of the **document** (already includes `scrollX`/`scrollY`; subtract them for viewport coords). |
| PDF (`scanPdf`) | Per page (`location.page`, **1-indexed**), origin = top-left of **that page**, in pdf.js viewport units at scale 1 (= PDF points, 1/72 in). To draw on a preview rendered at scale `s`, multiply every number by `s`. |

## Stage 2 HTTP contract (reference only, not built yet)

```
POST /score        { snippets: string[] }      → [{ score, label }]
POST /safe-read    { url } | { pdf_base64 }    → ScanResult
POST /visual-diff  { url } | { pdf_base64 }    → { hidden_spans: string[] }
MCP tool: safe_read(source) → ScanResult
```
