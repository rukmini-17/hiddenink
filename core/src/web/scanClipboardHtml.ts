// Paste guard for HTML on the clipboard. Browsers write copied content with inline styles
// (Chrome inlines computed color, font-size, etc.), so white-on-white or 1px text survives
// into text/html even though text/plain shows it as normal text.
// There is no layout here (DOMParser documents aren't rendered), so we read `style=""` only.

import type { ScanOptions, ScanResult } from "../types";
import { DEFAULT_THRESHOLD } from "../scorer/config";
import type { Hiding } from "./classify";
import { composite, contrastRatio, parseColor, WHITE, type RGBA } from "./color";
import { ancestors } from "./dom";
import { runWebScan } from "./engine";
import { WEB_LIMITS as L } from "./limits";

const INLINE_TAGS = new Set([
  "A", "ABBR", "B", "BDI", "BDO", "CITE", "CODE", "DFN", "EM", "FONT", "I", "KBD", "MARK", "Q", "S",
  "SAMP", "SMALL", "SPAN", "STRONG", "SUB", "SUP", "TIME", "U", "VAR", "LABEL",
]);

export function scanClipboardHtml(html: string, opts?: ScanOptions): ScanResult {
  // DOMParser never runs scripts or loads images, so untrusted clipboard HTML is safe to parse.
  const doc = new DOMParser().parseFromString(html, "text/html");
  const pageBg = assumedPageBackground(doc);
  return runWebScan(doc, {
    threshold: opts?.threshold ?? DEFAULT_THRESHOLD,
    classify: (node) => ({ hiding: classifyInline(node.parentElement!, pageBg) }),
    isInline: (el) => {
      const display = (el as HTMLElement).style?.display;
      return display ? display.startsWith("inline") : INLINE_TAGS.has(el.tagName);
    },
  });
}

const style = (el: Element) => (el as HTMLElement).style;

function classifyInline(el: Element, pageBg: RGBA | null): Hiding | null {
  for (const node of ancestors(el)) {
    const s = style(node);
    if (!s) continue;
    if (s.display === "none" || node.hasAttribute("hidden")) {
      return { technique: "display_none", element: node, reason: "hidden with display:none" };
    }
    if (s.visibility === "hidden" || s.visibility === "collapse") {
      return { technique: "display_none", element: node, reason: "hidden with visibility:hidden" };
    }
  }

  let opacity = 1;
  for (const node of ancestors(el)) {
    const o = style(node)?.opacity;
    if (o) opacity *= Number(o);
    if (opacity < L.minOpacity) return { technique: "transparent", element: node, reason: "its opacity makes it invisible" };
  }

  const colorEl = nearest(el, "color");
  const fg = colorEl ? parseColor(normalizeColor(style(colorEl).color)) : null;
  if (colorEl && fg && fg.a < L.minColorAlpha) {
    return { technique: "transparent", element: colorEl, reason: "the text color is fully transparent" };
  }

  const fontEl = nearest(el, "fontSize");
  if (fontEl) {
    const px = toPx(style(fontEl).fontSize);
    if (px !== null && px < L.tinyFontPx) {
      return { technique: "tiny_font", element: fontEl, reason: `the font is ${px}px, too small to read` };
    }
  }

  for (const node of ancestors(el)) {
    const hiding = inlineClipOrOffscreen(node);
    if (hiding) return hiding;
  }

  if (colorEl && fg) {
    const bg = inlineBackground(el) ?? pageBg;
    if (bg && contrastRatio(composite(fg, bg), bg) < L.minContrast) {
      return { technique: "low_contrast", element: colorEl, reason: "the text is almost the same color as the background" };
    }
  }
  return null;
}

function inlineClipOrOffscreen(node: Element): Hiding | null {
  const s = style(node);
  if (!s) return null;
  const positioned = s.position === "absolute" || s.position === "fixed";
  const hidesOverflow = ["hidden", "clip"].includes(s.overflow) || ["hidden", "clip"].includes(s.overflowX);
  const w = toPx(s.width);
  const h = toPx(s.height);
  const maxH = toPx(s.maxHeight);

  if (positioned && w !== null && h !== null && w <= 1 && h <= 1 && (hidesOverflow || /rect\(\s*0/.test(s.clip))) {
    return { technique: "clipped", element: node, reason: "clipped to a 1-pixel box", srOnly: true };
  }
  if ((positioned && /rect\(\s*0(px)?[\s,]+0/.test(s.clip)) || /inset\(\s*(4[5-9]|50|[5-9]\d|100)/.test(s.clipPath)) {
    return { technique: "clipped", element: node, reason: "clipped away" };
  }
  if (hidesOverflow && ((w !== null && w <= 1) || (h !== null && h <= 1) || maxH === 0)) {
    return { technique: "clipped", element: node, reason: "inside a zero-size box (overflow: hidden)" };
  }
  if (/scale\(\s*0(\.0+)?\s*[,)]/.test(s.transform)) {
    return { technique: "clipped", element: node, reason: "shrunk to zero size with transform: scale(0)" };
  }
  const far = (v: string) => {
    const px = toPx(v);
    return px !== null && px <= -1000;
  };
  if ((positioned && (far(s.left) || far(s.top))) || far(s.textIndent) || far(s.marginLeft)) {
    return { technique: "offscreen", element: node, reason: "moved far outside the page" };
  }
  return null;
}

/** Nearest ancestor (or self) with an inline value for an inherited property. */
function nearest(el: Element, prop: "color" | "fontSize"): Element | null {
  for (const node of ancestors(el)) if (style(node)?.[prop]) return node;
  return null;
}

/**
 * Composited inline background. Null if there's no inline background at all (copying from a
 * dark page gives light text with no background, and assuming white would flag everything),
 * or if a background image makes it unknowable. Chrome inlines background-color when copying.
 */
function inlineBackground(el: Element): RGBA | null {
  const layers: RGBA[] = [];
  for (const node of ancestors(el)) {
    const s = style(node);
    if (!s) continue;
    if (s.backgroundImage && s.backgroundImage !== "none" && s.backgroundImage !== "initial") return null;
    const bg = s.backgroundColor ? parseColor(normalizeColor(s.backgroundColor)) : null;
    if (bg && bg.a > 0) {
      layers.push(bg);
      if (bg.a >= 1) break;
    }
  }
  if (layers.length === 0) return null;
  return layers.reduceRight<RGBA>((under, layer) => composite(layer, under), WHITE);
}

/**
 * The page background to assume where the copied HTML has none inline.
 *
 * Chrome inlines each element's text color when copying, but usually not the page's background
 * (it sits on <body>, outside the selection). So a white line copied from a white page arrives
 * as "white text, no background". If most of the copied text is dark, the page was light: assume
 * white, so near-white text counts as hidden. If most of it is light, the page was dark (dark mode):
 * assume nothing, so light text isn't flagged. Text with no inline color counts as dark (the default).
 */
function assumedPageBackground(doc: Document): RGBA | null {
  let light = 0;
  let total = 0;
  const walker = doc.createTreeWalker(doc.body ?? doc.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const n = (node.textContent ?? "").trim().length;
    if (!n || !node.parentElement) continue;
    total += n;
    const colorEl = nearest(node.parentElement, "color");
    const fg = colorEl ? parseColor(normalizeColor(style(colorEl).color)) : null;
    if (fg && contrastRatio(composite(fg, WHITE), WHITE) < L.minContrast) light += n;
  }
  return total > 0 && light / total < 0.5 ? WHITE : null;
}

const NAMED: Record<string, string> = { white: "rgb(255, 255, 255)", black: "rgb(0, 0, 0)" };

/** Inline style values aren't normalized like computed ones: handle hex and common names. */
function normalizeColor(v: string): string {
  const value = v.trim().toLowerCase();
  if (NAMED[value]) return NAMED[value];
  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (!hex) return value;
  let h = hex[1];
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  const a = h.length === 8 ? n(6) / 255 : 1;
  return `rgba(${n(0)}, ${n(2)}, ${n(4)}, ${a})`;
}

/** px and pt to px; "0" in any unit is 0; relative units (em, %) are unknown → null. */
function toPx(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.trim().match(/^(-?[\d.]+)(px|pt)?$/);
  if (m) return Number(m[1]) * (m[2] === "pt" ? 4 / 3 : 1);
  const zero = v.trim().match(/^-?0+(\.0+)?[a-z%]*$/);
  return zero ? 0 : null;
}
