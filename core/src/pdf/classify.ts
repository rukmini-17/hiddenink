// Decide whether one PDF text item is hidden from a person, and how.

import type { Technique } from "../types";
import { PDF_LIMITS as L } from "./limits";
import { inkFraction, type RenderedPage } from "./sample";
import type { PdfTextItem } from "./textItems";

export type PdfHiding = {
  technique: Extract<Technique, "pdf_invisible" | "pdf_tiny_font" | "pdf_offpage">;
  reasons: string[];
  /** Normal in real documents (page numbers, footers, OCR layers): only report if AI-aimed. */
  usuallyLegit: boolean;
};

export type PageInfo = { width: number; height: number; rendered: RenderedPage; scanned: boolean };

export function classifyItem(item: PdfTextItem, page: PageInfo): PdfHiding | null {
  const { x, y, w, h } = item.box;

  // Off-page first: there are no pixels to sample out there.
  if (x + w <= 0 || y + h <= 0 || x >= page.width || y >= page.height) {
    return { technique: "pdf_offpage", reasons: ["invisible to you: placed outside the visible page area"], usuallyLegit: false };
  }

  const noInk = inkFraction(item, page.rendered) < L.minInkFraction;

  // Font size is an exact measurement, so check it before pixels (tiny glyphs are hard to sample).
  if (item.fontSize < L.tinyFontPt) {
    const reasons = [`invisible to you: the text is ${round(item.fontSize)}pt, far too small to read`];
    if (noInk) reasons.push("it's also the same color as the background");
    return { technique: "pdf_tiny_font", reasons, usuallyLegit: isOrdinaryTinyText(item, page) };
  }

  if (noInk) {
    return {
      technique: "pdf_invisible",
      reasons: [
        page.scanned
          ? "invisible to you: an invisible text layer over a scanned image, but nothing is drawn under it"
          : "invisible to you: nothing visible is drawn where this text sits (white text, invisible text mode, or something covering it)",
      ],
      // On a scanned page invisible text is the OCR layer, which is how scans become searchable.
      usuallyLegit: page.scanned,
    };
  }
  return null;
}

/** Page numbers, footnote/superscript markers, and header/footer lines are often tiny on purpose. */
function isOrdinaryTinyText(item: PdfTextItem, page: PageInfo): boolean {
  const markerOnly = /^[\p{N}\p{P}\p{S}\s]{1,6}$/u.test(item.str.trim());
  const margin = page.height * L.marginFraction;
  const inMargin = item.box.y + item.box.h <= margin || item.box.y >= page.height - margin;
  return markerOnly || inMargin;
}

const round = (n: number) => Math.round(n * 10) / 10;
