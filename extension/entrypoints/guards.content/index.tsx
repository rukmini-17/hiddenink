import { defineContentScript } from "wxt/utils/define-content-script";
import "@/assets/ui.css";
import { fileToBase64 } from "@/lib/base64";
import { CHATBOT_MATCHES, MAX_PDF_BYTES } from "@/lib/config";
import { cleanTextFile, isPdf } from "@/lib/files";
import { installPasteInterceptor, installUploadInterceptor, type UploadIntercept } from "@/lib/intercept";
import { sendToBackground, type PdfScanResponse } from "@/lib/messages";
import { hasFlagged, scanPaste } from "@/lib/scan";
import { createSettingsCache } from "@/lib/settings";
import { ShadowHost } from "@/lib/shadowHost";
import { PasteGuardModal } from "./PasteGuardModal";
import { UploadGuardModal } from "./UploadGuardModal";

// Paste guard + upload guard on chatbot sites. Must run at document_start so our capture-phase
// listeners are registered before the site's own.
//
// Privacy: clipboard contents and files are scanned on-device and never stored or sent anywhere
// (the PDF bytes only travel to the extension's own offscreen document).

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
          const res = await sendToBackground<PdfScanResponse>({
            type: "pdf:scan",
            target: "background",
            name: pdf.name,
            pdfBase64: await fileToBase64(pdf),
            testMode: settings.current.testMode,
          });
          if (!res.ok) throw new Error(res.error);
          if (!hasFlagged(res.result)) continue;

          await host.render(
            <UploadGuardModal
              fileName={pdf.name}
              result={res.result}
              previews={res.previews}
              onUploadAnyway={() => {
                close();
                upload.replay(upload.files);
              }}
              onUploadClean={() => {
                close();
                upload.replay(upload.files.map((f) => (f === pdf ? cleanTextFile(pdf.name, res.result.visibleText) : f)));
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
