// Public API of the HiddenInk engine.
// Implemented: scanText, cleanText (R2). Still stubs: scanDocument (R1), scanClipboardHtml (R1), scanPdf (R4).

import type { ScanOptions, ScanResult } from "./types";
import { cleanText } from "./unicode/cleanText";
import { scanUnicode } from "./unicode/scanUnicode";

export type { Technique, Finding, ScanResult, ScanOptions } from "./types";
export { cleanText };

/** Scan a live DOM (X-ray mode, Playwright eval). */
export function scanDocument(doc: Document, _opts?: ScanOptions): ScanResult {
  return { findings: [], visibleText: doc.body?.innerText ?? doc.body?.textContent ?? "" };
}

/** Scan plain text (paste guard): invisible-Unicode tricks only, since plain text has no styling. */
export function scanText(text: string, _opts?: ScanOptions): ScanResult {
  return { findings: scanUnicode(text), visibleText: cleanText(text) };
}

/** Scan clipboard HTML (paste guard). Only inline styles are available here. */
export function scanClipboardHtml(html: string, _opts?: ScanOptions): ScanResult {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return { findings: [], visibleText: doc.body?.textContent ?? "" };
}

/** Scan PDF bytes (upload guard). */
export async function scanPdf(_data: ArrayBuffer, _opts?: ScanOptions): Promise<ScanResult> {
  return { findings: [], visibleText: "" };
}
