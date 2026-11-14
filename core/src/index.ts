// Public API of the HiddenInk engine.
// Implemented: scanDocument, scanClipboardHtml (R1), scanText, cleanText (R2). Stub: scanPdf (R4).

import type { ScanOptions, ScanResult } from "./types";
import { applyScore } from "./scorer/applyScore";
import { DEFAULT_THRESHOLD } from "./scorer/config";
import { cleanText } from "./unicode/cleanText";
import { scanUnicode } from "./unicode/scanUnicode";

export type { Technique, Finding, ScanResult, ScanOptions } from "./types";
export { cleanText };
export { scanDocument } from "./web/scanDocument";
export { scanClipboardHtml } from "./web/scanClipboardHtml";

/** Scan plain text (paste guard): invisible-Unicode tricks only, since plain text has no styling. */
export function scanText(text: string, opts?: ScanOptions): ScanResult {
  const threshold = opts?.threshold ?? DEFAULT_THRESHOLD;
  return {
    findings: scanUnicode(text).map((f) => applyScore(f, threshold)),
    visibleText: cleanText(text),
  };
}

/** Scan PDF bytes (upload guard). */
export async function scanPdf(_data: ArrayBuffer, _opts?: ScanOptions): Promise<ScanResult> {
  return { findings: [], visibleText: "" };
}
