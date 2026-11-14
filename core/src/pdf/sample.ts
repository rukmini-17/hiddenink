// Render-and-sample: render the page like a viewer would, then look at the pixels under each
// text box. If they're all one color (no glyph shapes), a person sees nothing there: the text is
// white-on-white, drawn in invisible mode, or covered by a shape. One check covers all three.

import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import type { PdfTextItem } from "./textItems";
import { PDF_LIMITS as L } from "./limits";

type CanvasFactory = {
  create(w: number, h: number): { canvas: unknown; context: CanvasRenderingContext2D };
  destroy(c: { canvas: unknown; context: CanvasRenderingContext2D }): void;
};

export type RenderedPage = { pixels: Uint8ClampedArray; width: number; height: number };

export async function renderPage(page: PDFPageProxy, canvasFactory: CanvasFactory): Promise<RenderedPage> {
  const viewport = page.getViewport({ scale: L.renderScale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const target = canvasFactory.create(width, height);
  try {
    const ctx = target.context;
    // Paint paper white first, like every PDF viewer does, so "no background" means white.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    await page.render({ canvasContext: ctx, viewport, background: "rgb(255,255,255)" }).promise;
    return { pixels: ctx.getImageData(0, 0, width, height).data, width, height };
  } finally {
    canvasFactory.destroy(target);
  }
}

/** Fraction of pixels in the item's box that differ from the box's dominant color. */
export function inkFraction(item: PdfTextItem, page: RenderedPage): number {
  const s = L.renderScale;
  const x0 = clamp(Math.floor(item.box.x * s), page.width);
  const x1 = clamp(Math.ceil((item.box.x + item.box.w) * s), page.width);
  const y0 = clamp(Math.floor(item.box.y * s), page.height);
  const y1 = clamp(Math.ceil((item.box.y + item.box.h) * s), page.height);
  const total = (x1 - x0) * (y1 - y0);
  if (total <= 0) return 0;

  // Dominant color = most common color after rounding to 4 bits per channel.
  const counts = new Map<number, number>();
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * page.width + x) * 4;
      const key = ((page.pixels[i] >> 4) << 8) | ((page.pixels[i + 1] >> 4) << 4) | (page.pixels[i + 2] >> 4);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let dominant = 0;
  let best = -1;
  for (const [key, n] of counts) if (n > best) [dominant, best] = [key, n];
  const [dr, dg, db] = [((dominant >> 8) & 15) * 16 + 8, ((dominant >> 4) & 15) * 16 + 8, (dominant & 15) * 16 + 8];

  let ink = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * page.width + x) * 4;
      const p = page.pixels;
      const diff = Math.max(Math.abs(p[i] - dr), Math.abs(p[i + 1] - dg), Math.abs(p[i + 2] - db));
      if (diff > L.inkChannelDelta) ink++;
    }
  }
  return ink / total;
}

const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
