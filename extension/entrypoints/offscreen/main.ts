import { scanPdf, type ScanResult } from "@hiddenink/core";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { browser } from "wxt/browser";
import { base64ToBytes } from "@/lib/base64";
import { MAX_PREVIEW_PAGES, PREVIEW_SCALE } from "@/lib/config";
import { flaggedOf } from "@/lib/explain";
import type { Message, PagePreview, PdfScanResponse } from "@/lib/messages";
import { fakePdfResult } from "@/lib/testMode";

// Offscreen document (extension origin): a real pdf.js Worker is allowed here, and the page's
// Content-Security-Policy can't interfere. Content scripts send PDF bytes via the background.
// The same pdfjs-dist module instance is shared with `core`, so this worker setting applies to both.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

browser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  const msg = raw as Message;
  if (msg?.type !== "pdf:scan" || msg.target !== "offscreen") return;
  handleScan(msg).then(sendResponse, (err) => sendResponse({ ok: false, error: String(err) } satisfies PdfScanResponse));
  return true;
});

async function handleScan(msg: Extract<Message, { type: "pdf:scan" }>): Promise<PdfScanResponse> {
  const bytes = base64ToBytes(msg.pdfBase64);

  // pdf.js takes ownership of the buffer it is given, so each consumer gets its own copy.
  let result: ScanResult = await scanPdf(bytes.slice().buffer);
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  if (msg.testMode && flaggedOf(result.findings).length === 0) result = fakePdfResult(doc.numPages);

  const flagged = flaggedOf(result.findings);
  if (flagged.length === 0) return { ok: true, result, previews: [], pageCount: doc.numPages };

  const pages = [...new Set(flagged.map((f) => f.location.page ?? 1))].sort((a, b) => a - b).slice(0, MAX_PREVIEW_PAGES);
  const previews: PagePreview[] = [];
  for (const pageNo of pages) previews.push(await renderPage(doc, pageNo));
  return { ok: true, result, previews, pageCount: doc.numPages };
}

async function renderPage(doc: pdfjs.PDFDocumentProxy, pageNo: number): Promise<PagePreview> {
  const page = await doc.getPage(pageNo);
  const viewport = page.getViewport({ scale: PREVIEW_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  // intent "print": pdf.js then paces the render with timers instead of requestAnimationFrame,
  // which never fires in a hidden offscreen document (the default intent hangs forever here).
  await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;
  return { page: pageNo, dataUrl: canvas.toDataURL("image/jpeg", 0.85), width: canvas.width, height: canvas.height, scale: PREVIEW_SCALE };
}
