import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Finding } from "@hiddenink/core";
import { MAX_PREVIEW_PAGES, PREVIEW_SCALE } from "./config";
import type { PagePreview } from "./messages";

// Renders the pages that have flagged findings to JPEG previews for the upload guard.
//
// Same pdf.js build and module instance as `core` (pdfjs-dist/legacy, worker on the main thread via
// globalThis.pdfjsWorker, which core sets when scanPdf runs), so nothing extra to configure. Call this
// only after scanPdf, from a content script (needs a DOM canvas).

export async function renderPreviews(data: ArrayBuffer, flagged: Finding[]): Promise<PagePreview[]> {
  if (flagged.length === 0) return [];
  const pages = [...new Set(flagged.map((f) => f.location.page ?? 1))].sort((a, b) => a - b).slice(0, MAX_PREVIEW_PAGES);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)), isEvalSupported: false, verbosity: 0 }).promise;
  try {
    const previews: PagePreview[] = [];
    for (const pageNo of pages) previews.push(await renderPage(doc, pageNo));
    return previews;
  } finally {
    await doc.destroy();
  }
}

async function renderPage(doc: pdfjs.PDFDocumentProxy, pageNo: number): Promise<PagePreview> {
  const page = await doc.getPage(pageNo);
  const viewport = page.getViewport({ scale: PREVIEW_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  // intent "print": pdf.js paces the render with timers instead of requestAnimationFrame, which
  // stops in background tabs; the result looks the same for a preview.
  await page.render({ canvasContext: ctx, viewport, intent: "print", background: "rgb(255,255,255)" }).promise;
  return { page: pageNo, dataUrl: canvas.toDataURL("image/jpeg", 0.85), width: canvas.width, height: canvas.height, scale: PREVIEW_SCALE };
}
