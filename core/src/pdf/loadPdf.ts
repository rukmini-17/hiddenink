// Loads pdf.js the same way in Node, the IIFE bundle and the extension.
//
// We use the "legacy" build (the one pdf.js recommends for Node, and it also runs in browsers)
// and run pdf.js's worker code on the main thread by handing it the worker module directly
// (globalThis.pdfjsWorker). That means no workerSrc URL to configure anywhere. Parsing blocks
// the page briefly, which is fine for résumé-sized files.
//
// Canvas: pdf.js picks its own canvas factory: a DOM <canvas> in browsers, @napi-rs/canvas in
// Node (pdfjs-dist's optional dependency). We reuse that factory for rendering.

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

const g = globalThis as { pdfjsWorker?: unknown };
g.pdfjsWorker ??= pdfjsWorker;

export { pdfjs };

export async function openPdf(data: ArrayBuffer) {
  // Copy: pdf.js may take ownership of the buffer, and the upload guard still needs the original.
  const bytes = new Uint8Array(data.slice(0));
  return pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false, // MV3 extensions forbid eval
    disableFontFace: false,
    useSystemFonts: true,
    verbosity: 0, // errors only (no "missing standard font" warnings in the console)
  }).promise;
}
