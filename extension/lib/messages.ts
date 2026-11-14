import { browser } from "wxt/browser";

// Typed messages between the popup, the content scripts and the background.

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
  | { type: "xray:count"; flagged: number }; // content → background (badge)

export function sendToBackground<T>(msg: Message): Promise<T> {
  return browser.runtime.sendMessage(msg) as Promise<T>;
}

export function sendToTab<T>(tabId: number, msg: Message): Promise<T> {
  return browser.tabs.sendMessage(tabId, msg) as Promise<T>;
}
