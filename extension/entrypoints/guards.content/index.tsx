import { scanPdf } from "@hiddenink/core";
import { defineContentScript } from "wxt/utils/define-content-script";
import "@/assets/ui.css";
import { CHATBOT_MATCHES, MAX_PDF_BYTES } from "@/lib/config";
import { flaggedOf } from "@/lib/explain";
import { cleanTextFile, isPdf } from "@/lib/files";
import { installPasteInterceptor, installUploadInterceptor, type UploadIntercept } from "@/lib/intercept";
import { renderPreviews } from "@/lib/pdfPreview";
import { hasFlagged, scanPaste } from "@/lib/scan";
import { fakePdfResult } from "@/lib/testMode";
import { createSettingsCache } from "@/lib/settings";
import { ShadowHost } from "@/lib/shadowHost";
import { PasteGuardModal } from "./PasteGuardModal";
import { UploadGuardModal } from "./UploadGuardModal";

// Paste guard + upload guard on chatbot sites. Must run at document_start so our capture-phase
// listeners are registered before the site's own.
//
// Privacy: clipboard contents and files are scanned on-device, right here in the content script,
// and never stored or sent anywhere.

export default defineContentScript({
  matches: CHATBOT_MATCHES,
  runAt: "document_start",
  cssInjectionMode: "ui",

  main(ctx) {
    const host = new ShadowHost(ctx, "hiddenink-guard");
    const settings = createSettingsCache();
    const close = () => host.clear();

    // ---- Paste guard (N4) -------------------------------------------------------
    installPasteInterceptor(
      ctx,
      (paste) => {
        const result = scanPaste(paste.text, paste.html, settings.current.testMode);
        if (!hasFlagged(result)) return; // untouched: the paste goes through normally
        paste.block();
        void host.render(
          <PasteGuardModal
            result={result}
            onPasteClean={() => {
              close();
              paste.replayText(result.visibleText);
            }}
            onPasteAnyway={() => {
              close();
              paste.replayOriginal();
            }}
            onCancel={close}
          />,
        );
      },
      onPdfUpload,
    );

    // ---- Upload guard (N0 + N5) ----------------------------------------------------
    installUploadInterceptor(ctx, onPdfUpload);

    async function onPdfUpload(upload: UploadIntercept) {
      await settings.ready;
      const pdfs = upload.files.filter(isPdf);
      // Fail open on anything unexpected: HiddenInk must never eat a user's upload.
      try {
        for (const pdf of pdfs) {
          if (pdf.size > MAX_PDF_BYTES) continue;
          const bytes = await pdf.arrayBuffer();
          let result = await scanPdf(bytes); // core copies the buffer, so `bytes` stays usable for previews
          if (settings.current.testMode && !hasFlagged(result)) result = fakePdfResult(2);
          if (!hasFlagged(result)) continue;
          const previews = await renderPreviews(bytes, flaggedOf(result.findings));

          await host.render(
            <UploadGuardModal
              fileName={pdf.name}
              result={result}
              previews={previews}
              onUploadAnyway={() => {
                close();
                upload.replay(upload.files);
              }}
              onUploadClean={() => {
                close();
                upload.replay(upload.files.map((f) => (f === pdf ? cleanTextFile(pdf.name, result.visibleText) : f)));
              }}
              onCancel={close}
            />,
          );
          return; // the user decides; replay happens from the modal
        }
      } catch (err) {
        console.warn("[HiddenInk] PDF scan failed, letting the upload through", err);
      }
      upload.replay(upload.files);
    }
  },
});
