// Turn pdf.js text items into boxes in our finding coordinates:
// [x, y, w, h], origin top-left of the page, pdf.js viewport units at scale 1 (points).

import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { pdfjs } from "./loadPdf";

export type PdfTextItem = {
  str: string;
  /** Top-left box at scale 1. */
  box: { x: number; y: number; w: number; h: number };
  /** Glyph height (font size after transforms), in points. */
  fontSize: number;
  baseline: number;
  hasEOL: boolean;
};

export async function getTextItems(page: PDFPageProxy): Promise<PdfTextItem[]> {
  const viewport = page.getViewport({ scale: 1 });
  // disableNormalization keeps invisible Unicode intact for the Unicode scanner.
  const content = await page.getTextContent({ disableNormalization: true });
  const items: PdfTextItem[] = [];

  for (const raw of content.items) {
    if (!("str" in raw)) continue; // marked-content markers
    // Skip whitespace-only items. (Tag characters aren't whitespace, so Unicode-only items are kept.)
    if (!raw.str.trim()) continue;

    // Same math pdf.js's own text layer uses: viewport transform × text transform.
    const tx = pdfjs.Util.transform(viewport.transform, raw.transform);
    const fontSize = Math.hypot(tx[2], tx[3]);
    const style = content.styles[raw.fontName];
    const ascent = style?.ascent || 0.8;
    const descent = style?.descent || -0.2;
    const baseline = tx[5];
    items.push({
      str: raw.str,
      box: { x: tx[4], y: baseline - ascent * fontSize, w: Math.abs(raw.width), h: (ascent - descent) * fontSize },
      fontSize,
      baseline,
      hasEOL: raw.hasEOL,
    });
  }
  return items;
}
