// Decides whether one text node is hidden from a human, and how.
// Checks run cheapest/most certain first; the first match wins.

import type { Technique } from "../types";
import { effectiveBackground } from "./background";
import { contrastRatio, composite, parseColor } from "./color";
import { ancestors, area, climbInline, intersect, textBox, type Box, type StyleCache } from "./dom";
import { WEB_LIMITS as L } from "./limits";

export type Hiding = {
  technique: Exclude<Technique, "attr_text" | "html_comment">;
  /** The element responsible (used to group text nodes and as the finding's selector). */
  element: Element;
  reason: string;
  /** Matched the common screen-reader-only pattern (legit unless the text is AI-aimed). */
  srOnly?: boolean;
};

export type Classified = { hiding: Hiding | null; box: Box };

export function classifyTextNode(node: Text, styles: StyleCache): Classified {
  const el = node.parentElement!;
  const box = textBox(node);
  const hiding =
    notRendered(el, styles) ??
    transparent(el, styles) ??
    tinyFont(el, styles) ??
    // Before clipped: `text-indent:-9999px; overflow:hidden` is both, and "offscreen" explains it better.
    offscreen(el, box) ??
    clipped(el, box, styles) ??
    lowContrast(el, styles);
  return { hiding, box };
}

// ---- display:none / visibility:hidden / collapsed --------------------------------------------

function notRendered(el: Element, styles: StyleCache): Hiding | null {
  for (const node of ancestors(el)) {
    if (styles.get(node).display === "none") {
      return { technique: "display_none", element: node, reason: "hidden with display:none" };
    }
  }
  const vis = styles.get(el).visibility;
  if (vis === "hidden" || vis === "collapse") {
    // visibility is inherited: report the outermost element that set it.
    let top = el;
    while (top.parentElement && styles.get(top.parentElement).visibility === vis) top = top.parentElement;
    return { technique: "display_none", element: top, reason: "hidden with visibility:hidden" };
  }
  // Catches content-visibility:hidden and closed <details>, which the checks above miss.
  if ("checkVisibility" in el && !(el as HTMLElement).checkVisibility()) {
    return { technique: "display_none", element: el, reason: "inside a collapsed or skipped section" };
  }
  return null;
}

// ---- opacity / transparent color -------------------------------------------------------------

function transparent(el: Element, styles: StyleCache): Hiding | null {
  let product = 1;
  let faintest: Element = el;
  let faintestOpacity = 1;
  for (const node of ancestors(el)) {
    const o = Number(styles.get(node).opacity);
    product *= o;
    if (o < faintestOpacity) [faintest, faintestOpacity] = [node, o];
  }
  if (product < L.minOpacity) {
    return { technique: "transparent", element: faintest, reason: `opacity is ${round(product)}, so it's invisible` };
  }

  const s = styles.get(el);
  const fill = s.getPropertyValue("-webkit-text-fill-color");
  const color = parseColor(fill && fill !== s.color ? fill : s.color);
  if (color && color.a < L.minColorAlpha) {
    return { technique: "transparent", element: climbInline(el, styles, "color"), reason: "the text color is fully transparent" };
  }
  return null;
}

// ---- font-size -------------------------------------------------------------------------------

function tinyFont(el: Element, styles: StyleCache): Hiding | null {
  const px = parseFloat(styles.get(el).fontSize);
  if (px >= L.tinyFontPx) return null;
  return { technique: "tiny_font", element: climbInline(el, styles, "font-size"), reason: `the font is ${round(px)}px, too small to read` };
}

// ---- clipped / zero-size / sr-only -----------------------------------------------------------

const CLIP_ZERO = /^rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)$/;
const CLIP_PATH_EMPTY = /inset\(\s*(4[5-9]|50|[5-9]\d|100)(\.\d+)?%|circle\(\s*0(px|%)?\s*[a)]/;

function clipped(el: Element, box: Box, styles: StyleCache): Hiding | null {
  const sr = srOnlyElement(el, styles);
  if (sr) return { technique: "clipped", element: sr, reason: "clipped to a 1-pixel box", srOnly: true };

  for (const node of ancestors(el)) {
    const s = styles.get(node);
    if (CLIP_ZERO.test(s.clip) && isPositioned(s)) {
      return { technique: "clipped", element: node, reason: "clipped away with clip: rect(0 0 0 0)" };
    }
    if (CLIP_PATH_EMPTY.test(s.clipPath)) {
      return { technique: "clipped", element: node, reason: "clipped away with clip-path" };
    }
  }

  // getBoundingClientRect includes transforms, so scale(0) and zero-size boxes show up here.
  if (area(box) <= L.clippedMaxArea) {
    return { technique: "clipped", element: zeroSizeRoot(el), reason: "shrunk to zero size" };
  }

  // Text rects ignore overflow clipping, so intersect with every overflow:hidden box ourselves
  // (including the text's own parent: `width:0; overflow:hidden` still reports full-size glyphs).
  let visible = box;
  const doc = el.ownerDocument;
  for (const node of ancestors(el)) {
    // overflow on <html>/<body> applies to the viewport (scrolling), not to their own box.
    if (node === doc.body || node === doc.documentElement) continue;
    const s = styles.get(node);
    if (!clipsOverflow(s)) continue;
    const r = node.getBoundingClientRect();
    visible = intersect(visible, { left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    if (area(visible) <= L.clippedMaxArea) {
      return { technique: "clipped", element: node, reason: "inside a box too small to show it (overflow: hidden)" };
    }
  }
  return null;
}

/** The classic `.sr-only` utility: absolutely positioned, ~1px box, overflow hidden or clipped. */
function srOnlyElement(el: Element, styles: StyleCache): Element | null {
  let depth = 0;
  for (const node of ancestors(el)) {
    if (depth++ > 3) break;
    const s = styles.get(node);
    if (!isPositioned(s)) continue;
    const r = node.getBoundingClientRect();
    const tiny = r.width <= 1.5 && r.height <= 1.5;
    const hides = clipsOverflow(s) || CLIP_ZERO.test(s.clip) || CLIP_PATH_EMPTY.test(s.clipPath);
    if (tiny && hides) return node;
  }
  return null;
}

/** Outermost ancestor that's also zero-size, so `<div style="transform:scale(0)"><p>…` groups as one. */
function zeroSizeRoot(el: Element): Element {
  let cur = el;
  while (cur.parentElement && cur.parentElement !== el.ownerDocument.body) {
    const r = cur.parentElement.getBoundingClientRect();
    if (r.width * r.height > L.clippedMaxArea) break;
    cur = cur.parentElement;
  }
  return cur;
}

const isPositioned = (s: CSSStyleDeclaration) => s.position === "absolute" || s.position === "fixed";
const clipsOverflow = (s: CSSStyleDeclaration) =>
  ["hidden", "clip"].includes(s.overflowX) || ["hidden", "clip"].includes(s.overflowY);

// ---- offscreen -------------------------------------------------------------------------------

function offscreen(el: Element, box: Box): Hiding | null {
  if (!isOffscreen(box, el.ownerDocument)) return null;
  // Report the outermost element that is itself fully offscreen (the one that was moved).
  let cur = el;
  while (cur.parentElement && cur.parentElement !== el.ownerDocument.body) {
    if (!isOffscreen(cur.parentElement.getBoundingClientRect(), el.ownerDocument)) break;
    cur = cur.parentElement;
  }
  return { technique: "offscreen", element: cur, reason: "positioned outside the page where you can't scroll to it" };
}

function isOffscreen(b: Box, doc: Document): boolean {
  const win = doc.defaultView!;
  const root = doc.documentElement;
  // Convert viewport coords to document coords.
  const left = b.left + win.scrollX;
  const right = b.right + win.scrollX;
  const top = b.top + win.scrollY;
  const bottom = b.bottom + win.scrollY;
  const docWidth = Math.max(root.scrollWidth, win.innerWidth);
  const docHeight = Math.max(root.scrollHeight, win.innerHeight);
  return (
    right <= 0 || bottom <= 0 || left >= docWidth || top >= docHeight ||
    left >= win.innerWidth * L.offscreenViewports
  );
}

// ---- low contrast ----------------------------------------------------------------------------

function lowContrast(el: Element, styles: StyleCache): Hiding | null {
  const fg = parseColor(styles.get(el).color);
  const bg = effectiveBackground(el, styles);
  if (!fg || !bg) return null;
  const ratio = contrastRatio(composite(fg, bg), bg);
  if (ratio >= L.minContrast) return null;
  return {
    technique: "low_contrast",
    element: climbInline(el, styles, "color"),
    reason: `the text is almost the same color as the background (contrast ${round(ratio)}:1)`,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
