// Reads pdf.js's operator list (the page's drawing instructions) for two things that pdf.js's
// own text extraction (getTextContent) deliberately throws away, but other extractors used by
// AI tools (pdftotext, PyPDF, …) may keep:
//   1. glyphs positioned outside the page box (getTextContent drops them), and
//   2. invisible "format" characters: Unicode tags, zero-width, bidi (getTextContent strips them).
// It also detects scanned pages (one big image covering the page).
//
// The text walk is a simplified PDF text state machine: enough to place each text run
// (one Tj/TJ) on the page, not a full layout engine. Vertical fonts aren't modeled.

import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { pdfjs } from "./loadPdf";
import { PDF_LIMITS as L } from "./limits";
import type { PdfTextItem } from "./textItems";

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
type Glyph = { unicode: string; width: number; isSpace: boolean } | number | null;

export type PageOperators = {
  scanned: boolean;
  /** Every text run with its raw Unicode (invisible characters included), in our top-left box coords. */
  runs: PdfTextItem[];
};

export async function readOperators(page: PDFPageProxy): Promise<PageOperators> {
  const { fnArray, argsArray } = await page.getOperatorList();
  const { OPS, Util } = pdfjs;
  const viewport = page.getViewport({ scale: 1 });
  const [px0, py0, px1, py1] = page.view;
  const pageArea = (px1 - px0) * (py1 - py0);

  let scanned = false;
  const runs: PdfTextItem[] = [];

  // Graphics state (CTM) and text state, as in the PDF spec (section 9.3).
  const stack: Matrix[] = [];
  let ctm = IDENTITY;
  let tm = IDENTITY; // text matrix
  let tlm = IDENTITY; // text line matrix
  let fontSize = 12;
  let leading = 0;
  let charSpacing = 0;
  let wordSpacing = 0;
  let hScale = 1;
  let rise = 0;

  const moveLine = (tx: number, ty: number) => {
    tlm = Util.transform(tlm, [1, 0, 0, 1, tx, ty]) as Matrix;
    tm = tlm;
  };

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[];
    switch (fn) {
      case OPS.save: stack.push(ctm); break;
      case OPS.restore: ctm = stack.pop() ?? IDENTITY; break;
      case OPS.transform: ctm = Util.transform(ctm, args as Matrix) as Matrix; break;
      case OPS.paintFormXObjectBegin:
        stack.push(ctm);
        if (Array.isArray(args[0])) ctm = Util.transform(ctm, args[0] as Matrix) as Matrix;
        break;
      case OPS.paintFormXObjectEnd: ctm = stack.pop() ?? IDENTITY; break;
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject: {
        // Images fill the unit square, so the CTM's determinant is the drawn area.
        const area = Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
        if (area >= pageArea * L.scanImageCoverage) scanned = true;
        break;
      }
      case OPS.beginText: tm = tlm = IDENTITY; break;
      case OPS.setFont: fontSize = Number(args[1]); break;
      case OPS.setLeading: leading = Number(args[0]); break;
      case OPS.setCharSpacing: charSpacing = Number(args[0]); break;
      case OPS.setWordSpacing: wordSpacing = Number(args[0]); break;
      case OPS.setHScale: hScale = Number(args[0]) / 100; break;
      case OPS.setTextRise: rise = Number(args[0]); break;
      case OPS.setTextMatrix: {
        const m = (Array.isArray(args[0]) ? args[0] : args) as Matrix;
        tm = tlm = [...m] as Matrix;
        break;
      }
      case OPS.moveText: moveLine(Number(args[0]), Number(args[1])); break;
      case OPS.setLeadingMoveText:
        leading = -Number(args[1]);
        moveLine(Number(args[0]), Number(args[1]));
        break;
      case OPS.nextLine: moveLine(0, -leading); break;
      case OPS.showText: {
        const glyphs = args[0] as Glyph[];
        let advance = 0; // text-space units
        let str = "";
        for (const g of glyphs) {
          if (typeof g === "number") {
            advance -= (g / 1000) * fontSize * hScale; // TJ kerning
            if (g < -200) str += " "; // big TJ gaps are word spaces
          } else if (g) {
            str += g.unicode;
            advance += ((g.width / 1000) * fontSize + charSpacing + (g.isSpace ? wordSpacing : 0)) * hScale;
          }
        }
        if (str.trim()) runs.push(placeRun(str, advance, tm, ctm, fontSize, rise, viewport.transform as Matrix));
        tm = Util.transform(tm, [1, 0, 0, 1, advance, 0]) as Matrix;
        break;
      }
    }
  }
  return { scanned, runs };
}

/** Map a run from text space to our page box (top-left origin, scale 1). */
function placeRun(str: string, advance: number, tm: Matrix, ctm: Matrix, fontSize: number, rise: number, vt: Matrix): PdfTextItem {
  const { Util } = pdfjs;
  // text space → user space → viewport (top-left) space
  const toPage = Util.transform(vt, Util.transform(ctm, tm)) as Matrix;
  const at = (x: number, y: number) => Util.applyTransform([x, y], toPage) as [number, number];
  const corners = [at(0, rise - 0.2 * fontSize), at(advance, rise - 0.2 * fontSize), at(0, rise + 0.8 * fontSize), at(advance, rise + 0.8 * fontSize)];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  const size = fontSize * Math.hypot(toPage[2], toPage[3]);
  return {
    str,
    box: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y },
    fontSize: size,
    baseline: at(0, rise)[1],
    hasEOL: false,
  };
}
