// Node-only fixture (uses @napi-rs/canvas to draw real glyphs into the fake scan).
import { createCanvas } from "@napi-rs/canvas";
import { image, makePdf, text, type PageSpec } from "./makePdf";

/**
 * A "scanned" page: the visible words are pixels in a full-page image (drawn with a real font),
 * and an invisible OCR text layer (render mode 3) sits on top, aligned with the words.
 */
export function scannedPage(): Uint8Array {
  const W = 612;
  const H = 792;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fbfaf6"; // slightly off-white, like scanned paper
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#111";
  const lines: [number, string, number][] = [
    [100, "Jane Doe", 24],
    [140, "Senior Software Engineer", 14],
    [170, "Built distributed systems at Acme for six years.", 12],
  ];
  for (const [top, str, size] of lines) {
    ctx.font = `${size}px sans-serif`;
    ctx.fillText(str, 72, top);
  }
  const rgba = ctx.getImageData(0, 0, W, H).data;
  const rgb = new Uint8Array(W * H * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) rgb.set([rgba[i], rgba[i + 1], rgba[i + 2]], j);

  const page: PageSpec = {
    images: { Scan: { width: W, height: H, rgb } },
    content: [
      image("Scan", 0, 0, W, H),
      // OCR layer: same baselines, flipped to PDF's bottom-left origin.
      ...lines.map(([top, str, size]) => text(72, H - top, str, { size, mode: 3 })),
    ],
  };
  return makePdf([page]);
}
