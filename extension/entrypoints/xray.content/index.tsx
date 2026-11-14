import { scanDocument, type ScanResult } from "@hiddenink/core";
import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import "@/assets/ui.css";
import { flaggedOf } from "@/lib/explain";
import { sendToBackground, type Message, type XrayStatus } from "@/lib/messages";
import { createSettingsCache } from "@/lib/settings";
import { ShadowHost } from "@/lib/shadowHost";
import { fakeDomResult } from "@/lib/testMode";
import { XrayOverlay } from "./XrayOverlay";

// X-ray mode. Runs on every page but stays idle until the popup says "toggle".

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  cssInjectionMode: "ui",

  main(ctx) {
    const host = new ShadowHost(ctx, "hiddenink-xray");
    const settings = createSettingsCache();
    let on = false;
    let result: ScanResult = { findings: [], visibleText: "" };

    const status = (): XrayStatus => ({ on, flagged: flaggedOf(result.findings).length, total: result.findings.length });

    async function show() {
      await settings.ready;
      result = scanDocument(document);
      if (settings.current.testMode && flaggedOf(result.findings).length === 0) result = fakeDomResult(document);
      on = true;
      await host.render(<XrayOverlay findings={result.findings} visibleText={result.visibleText} onClose={hide} />);
      void sendToBackground({ type: "xray:count", flagged: flaggedOf(result.findings).length });
    }

    function hide() {
      on = false;
      host.clear();
      void sendToBackground({ type: "xray:count", flagged: 0 });
    }

    // bboxes are a snapshot of the layout at scan time, so a resize (reflow) means a fresh scan.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    ctx.addEventListener(window, "resize", () => {
      if (!on) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => void show(), 250);
    });

    browser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
      const msg = raw as Message;
      if (msg?.type === "xray:status") {
        sendResponse(status());
        return;
      }
      if (msg?.type === "xray:toggle") {
        (on ? Promise.resolve(hide()) : show()).then(() => sendResponse(status()));
        return true;
      }
    });
  },
});
