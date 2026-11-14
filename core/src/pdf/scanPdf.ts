// PDF engine: finds text an AI would extract from a PDF but a person can't see on the page.

import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import type { Finding, ScanOptions, ScanResult } from "../types";
import { applyScore } from "../scorer/applyScore";
import { DEFAULT_THRESHOLD } from "../scorer/config";
import { scoreAiAimed } from "../scorer/score";
import { cleanText } from "../unicode/cleanText";
import { scanUnicode } from "../unicode/scanUnicode";
import { classifyItem, type PageInfo, type PdfHiding } from "./classify";
import { openPdf } from "./loadPdf";
import { readOperators } from "./operators";
import { renderPage } from "./sample";
import { getTextItems, type PdfTextItem } from "./textItems";

type Group = { hiding: PdfHiding; items: PdfTextItem[] };

export async function scanPdfImpl(data: ArrayBuffer, opts?: ScanOptions): Promise<ScanResult> {
  const threshold = opts?.threshold ?? DEFAULT_THRESHOLD;
  const doc = await openPdf(data);
  const raw: Finding[] = [];
  const pageTexts: string[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { findings, visibleText } = await scanPage(page, n, doc.canvasFactory as never, threshold);
      raw.push(...findings);
      pageTexts.push(visibleText);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  const findings = raw.map((f) => applyScore(f, threshold)).map((f, i) => ({ ...f, id: `pdf${i}-${f.technique}` }));
  return { findings, visibleText: cleanText(pageTexts.filter(Boolean).join("\n\n")) };
}

async function scanPage(page: PDFPageProxy, pageNumber: number, canvasFactory: never, threshold: number) {
  const viewport = page.getViewport({ scale: 1 });
  const [textItems, rendered, ops] = await Promise.all([
    getTextItems(page),
    renderPage(page, canvasFactory),
    readOperators(page),
  ]);
  const info: PageInfo = { width: viewport.width, height: viewport.height, rendered, scanned: ops.scanned };
  const isOffPage = ({ box: b }: PdfTextItem) => b.x + b.w <= 0 || b.y + b.h <= 0 || b.x >= info.width || b.y >= info.height;
  // getTextContent drops off-page glyphs, so add those runs back from the operator list.
  const items = [...textItems, ...ops.runs.filter(isOffPage)];

  const findings: Finding[] = [];
  const visible: PdfTextItem[] = [];
  const groups: Group[] = [];

  // getTextContent also strips invisible Unicode, so the Unicode scanner reads the raw runs.
  for (const run of ops.runs) {
    for (const f of scanUnicode(run.str)) findings.push({ ...f, location: { page: pageNumber, bbox: toBbox([run]) } });
  }

  for (const item of items) {
    const hiding = classifyItem(item, info);
    if (!hiding) {
      visible.push(item);
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.hiding.technique === hiding.technique && isNear(last.items, item)) last.items.push(item);
    else groups.push({ hiding, items: [item] });
  }

  for (const group of groups) {
    const text = joinItems(group.items);
    const aiAimed = scoreAiAimed(text).score >= threshold;
    // Page numbers, tiny footers and OCR layers are normal: count them as visible unless AI-aimed.
    if (group.hiding.usuallyLegit && !aiAimed) {
      visible.push(...group.items);
      continue;
    }
    findings.push({
      id: "",
      technique: group.hiding.technique,
      text,
      location: { page: pageNumber, bbox: toBbox(group.items) },
      aiScore: 0, // scored with every other finding in scanPdfImpl
      flagged: false,
      reasons: group.hiding.reasons,
    });
  }

  visible.sort((a, b) => items.indexOf(a) - items.indexOf(b));
  return { findings, visibleText: joinLines(visible) };
}

/** Same line if baselines are within half the larger font (so superscripts stay on their line). */
const onSameLine = (a: PdfTextItem, b: PdfTextItem) =>
  Math.abs(a.baseline - b.baseline) < Math.max(a.fontSize, b.fontSize) * 0.5;

/** Next item continues a hidden group if it's on the same line or the line just below. */
function isNear(group: PdfTextItem[], next: PdfTextItem): boolean {
  const prev = group[group.length - 1];
  const sameLine = onSameLine(prev, next);
  if (sameLine) return next.box.x - (prev.box.x + prev.box.w) < prev.fontSize * 2;
  const lineGap = next.box.y - (prev.box.y + prev.box.h);
  const left = Math.min(...group.map((i) => i.box.x));
  return lineGap >= -prev.fontSize && lineGap < prev.fontSize * 1.5 && Math.abs(next.box.x - left) < prev.fontSize * 4;
}

/** Join items into one string, adding spaces where pdf.js split a line into pieces. */
function joinItems(items: PdfTextItem[]): string {
  let out = "";
  items.forEach((item, i) => {
    const prev = items[i - 1];
    if (prev) {
      const gap = item.box.x - (prev.box.x + prev.box.w);
      if (!onSameLine(prev, item) || gap > prev.fontSize * 0.15) out += " ";
    }
    out += item.str;
  });
  return out.replace(/\s+/g, " ").trim();
}

/** Visible items → lines of text (new line when the baseline moves). */
function joinLines(items: PdfTextItem[]): string {
  const lines: PdfTextItem[][] = [];
  for (const item of items) {
    const line = lines[lines.length - 1];
    const prev = line?.[line.length - 1];
    if (prev && onSameLine(prev, item)) line.push(item);
    else lines.push([item]);
  }
  return lines.map(joinItems).filter(Boolean).join("\n");
}

function toBbox(items: PdfTextItem[]): [number, number, number, number] {
  const x0 = Math.min(...items.map((i) => i.box.x));
  const y0 = Math.min(...items.map((i) => i.box.y));
  const x1 = Math.max(...items.map((i) => i.box.x + i.box.w));
  const y1 = Math.max(...items.map((i) => i.box.y + i.box.h));
  return [x0, y0, x1 - x0, y1 - y0].map((v) => Math.round(v * 100) / 100) as [number, number, number, number];
}
