import { scanClipboardHtml, scanText, type ScanResult } from "@hiddenink/core";
import { TEST_MODE_MIN_PASTE_CHARS } from "./config";
import { flaggedOf } from "./explain";
import { fakeTextResult } from "./testMode";

// Thin wrappers around `core` that add test mode. Synchronous on purpose: the paste guard
// has to decide inside the event handler.

export function hasFlagged(result: ScanResult): boolean {
  return flaggedOf(result.findings).length > 0;
}

/** Scan a paste with both the plain-text and the HTML flavours. "Paste clean" inserts `visibleText`. */
export function scanPaste(text: string, html: string, testMode: boolean): ScanResult {
  const plain = scanText(text);
  const rich = html ? scanClipboardHtml(html) : { findings: [], visibleText: "" };
  // Both flavours see the same invisible characters, so drop HTML findings the plain scan already has.
  const key = (f: { technique: string; text: string; decoded?: string }) => `${f.technique}|${(f.decoded ?? f.text).replace(/\s+/g, " ").trim()}`;
  const seen = new Set(plain.findings.map(key));
  const findings = [...plain.findings, ...rich.findings.filter((f) => !seen.has(key(f))).map((f) => ({ ...f, id: `html-${f.id}` }))];
  // When the HTML flavour found hidden styled text, its visibleText is the one with that text removed.
  const visibleText = rich.findings.length > 0 ? rich.visibleText : plain.visibleText;
  const result: ScanResult = { findings, visibleText };
  if (testMode && !hasFlagged(result) && text.length >= TEST_MODE_MIN_PASTE_CHARS) return fakeTextResult(text);
  return result;
}
