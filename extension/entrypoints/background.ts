import { defineBackground } from "wxt/utils/define-background";
import { browser, type Browser } from "wxt/browser";
import type { Message, PdfScanResponse } from "@/lib/messages";

// Background service worker: routes PDF scans to the offscreen document and keeps the badge count.

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    const msg = raw as Message;
    if (msg?.type === "xray:count" && sender.tab?.id != null) {
      void browser.action.setBadgeBackgroundColor({ color: "#e8a33d" });
      void browser.action.setBadgeText({ tabId: sender.tab.id, text: msg.flagged ? String(msg.flagged) : "" });
      return;
    }
    if (msg?.type === "pdf:scan" && msg.target === "background") {
      scanInOffscreen(msg).then(sendResponse, (err) => sendResponse({ ok: false, error: String(err) } satisfies PdfScanResponse));
      return true; // async response
    }
  });
});

const OFFSCREEN_URL = "/offscreen.html";
let creating: Promise<void> | null = null;

/** Create the offscreen document once; Chrome allows only one per extension. */
async function ensureOffscreen(): Promise<void> {
  const url = browser.runtime.getURL(OFFSCREEN_URL);
  const contexts = await browser.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT" as Browser.runtime.ContextType], documentUrls: [url] });
  if (contexts.length > 0) return;
  creating ??= browser.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: ["WORKERS" as Browser.offscreen.Reason],
      justification: "Scan uploaded PDFs with pdf.js and render page previews, away from the page's CSP.",
    })
    .finally(() => (creating = null));
  await creating;
}

async function scanInOffscreen(msg: Extract<Message, { type: "pdf:scan" }>): Promise<PdfScanResponse> {
  await ensureOffscreen();
  const res = (await browser.runtime.sendMessage({ ...msg, target: "offscreen" })) as PdfScanResponse | undefined;
  return res ?? { ok: false, error: "offscreen document did not answer" };
}
