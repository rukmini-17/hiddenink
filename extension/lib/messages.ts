import type { ScanResult } from "@hiddenink/core";
import { browser } from "wxt/browser";

// Typed messages between popup, content scripts, background and the offscreen document.

export type PagePreview = {
  page: number; // 1-based
  dataUrl: string; // JPEG of the rendered page
  width: number; // rendered pixel size
  height: number;
  scale: number; // rendered px per pdf.js viewport unit (bboxes are at scale 1)
};

export type XrayStatus = { on: boolean; flagged: number; total: number };

export type Message =
  | { type: "xray:toggle" } // popup → content
  | { type: "xray:status" } // popup → content
  | { type: "xray:count"; flagged: number } // content → background (badge)
  | { type: "pdf:scan"; target: "background" | "offscreen"; name: string; pdfBase64: string; testMode: boolean };

export type PdfScanResponse =
  | { ok: true; result: ScanResult; previews: PagePreview[]; pageCount: number }
  | { ok: false; error: string };

export function sendToBackground<T>(msg: Message): Promise<T> {
  return browser.runtime.sendMessage(msg) as Promise<T>;
}

export function sendToTab<T>(tabId: number, msg: Message): Promise<T> {
  return browser.tabs.sendMessage(tabId, msg) as Promise<T>;
}
