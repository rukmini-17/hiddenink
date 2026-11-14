// Public API of the HiddenInk engine.
// R0: every function is a stub that returns "no findings" so the extension can
// integrate against the real signatures. Detectors land in R1–R4.

import type { ScanOptions, ScanResult } from "./types";

export type { Technique, Finding, ScanResult, ScanOptions } from "./types";

/** Scan a live DOM (X-ray mode, Playwright eval). */
export function scanDocument(doc: Document, _opts?: ScanOptions): ScanResult {
  return { findings: [], visibleText: doc.body?.innerText ?? doc.body?.textContent ?? "" };
}

/** Scan plain text (paste guard). */
export function scanText(text: string, _opts?: ScanOptions): ScanResult {
  return { findings: [], visibleText: text };
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

/** Strip invisible Unicode (keeps legitimate flag-emoji tag sequences). */
export function cleanText(text: string): string {
  return text;
}
