import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import type { Message } from "@/lib/messages";

// Background service worker: only keeps the toolbar badge in sync with the X-ray count.
// Scanning happens entirely in the content scripts (pdf.js needs a DOM, which a service worker lacks).

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((raw, sender) => {
    const msg = raw as Message;
    if (msg?.type === "xray:count" && sender.tab?.id != null) {
      void browser.action.setBadgeBackgroundColor({ color: "#e8a33d" });
      void browser.action.setBadgeText({ tabId: sender.tab.id, text: msg.flagged ? String(msg.flagged) : "" });
    }
  });
});
