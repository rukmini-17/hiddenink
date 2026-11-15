import type { Finding, Technique } from "@hiddenink/core";

// Where to draw each revealed line, in document CSS px (the page's top-left is 0,0).
//
// `core` gives `location.bbox` as [x, y, w, h] in document px. When a finding has no usable bbox we
// fall back to the live rect of `location.selector`. display:none text is drawn where it would appear
// in the text flow. Comments, text moved off-screen and text in unrendered sections are only listed.

export type DocRect = { x: number; y: number; w: number; h: number };
/** `font` is set when the text sits in a code block, so the copy uses the code's own font and lines up. */
export type Placed = { finding: Finding; rect: DocRect; width: number; font?: { family: string; size: string } };

/** No box of their own: `core` points at the parent element, so drawing there would cover real text. */
const NO_OWN_BOX: Technique[] = ["html_comment"];

/** Characters hidden inside visible text: draw the copy just under that text instead of on top of it. */
const INSIDE_VISIBLE_TEXT: Technique[] = ["unicode_tags", "zero_width", "bidi", "variation_selectors"];

const MIN_WIDTH = 240;

function resolveElement(f: Finding): Element | null {
  if (!f.location.selector) return null;
  try {
    return document.querySelector(f.location.selector);
  } catch {
    return null;
  }
}

const INLINE_TAGS = new Set(["SPAN", "A", "B", "I", "EM", "STRONG", "CODE", "SMALL", "MARK", "U", "S", "SUB", "SUP", "LABEL", "KBD", "SAMP", "VAR"]);

/**
 * display:none text has no box. Measure where it would sit if shown: put an invisible copy right
 * after it, read its rect, take it out again. All in one synchronous step, so the page never paints
 * the copy. Returns null when the surrounding block isn't rendered either (e.g. a closed section).
 */
function wouldBeRect(el: Element): DocRect | null {
  const probe = el.cloneNode(true) as HTMLElement;
  probe.removeAttribute("id");
  probe.style.setProperty("display", INLINE_TAGS.has(el.tagName) ? "inline" : "block", "important");
  probe.style.setProperty("visibility", "hidden", "important");
  el.after(probe);
  try {
    // Measure from the first visible character: the hidden text often starts with a space or a line
    // break (" pkg" after "pip install x", "\nimport y" in a <pre>), and the drawn copy is trimmed.
    let rects: DOMRectList | DOMRect[] = probe.getClientRects();
    const walker = document.createTreeWalker(probe, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      const i = n.data.search(/\S/);
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(probe, probe.childNodes.length);
      rects = range.getClientRects();
      break;
    }
    const r = [...rects].find((c) => c.width > 1 && c.height > 0);
    return r ? { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height } : null;
  } finally {
    probe.remove();
  }
}

// Any size above zero counts: at a browser zoom below 100% a 1px element (e.g. a pixel image carrying
// alt text) measures about 0.9px. Elements that aren't rendered at all have no client rects.
function documentRect(f: Finding): DocRect | null {
  const b = f.location.bbox;
  if (b && b[2] > 0 && b[3] > 0) return { x: b[0], y: b[1], w: b[2], h: b[3] };
  const el = resolveElement(f);
  if (!el) return null;
  if (el.getClientRects().length === 0) return f.technique === "display_none" ? wouldBeRect(el) : null;
  const r = el.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  return null;
}

/** Width of the block the hidden text belongs to, so the copy wraps like the page's own text. */
function blockWidth(f: Finding): number {
  const el = resolveElement(f);
  if (!el) return 0;
  const w = el.getBoundingClientRect().width;
  if (w >= MIN_WIDTH) return w;
  return el.parentElement?.getBoundingClientRect().width ?? w; // e.g. a 1×1 image carrying alt text
}

export function place(f: Finding): Placed | null {
  if (NO_OWN_BOX.includes(f.technique)) return null;
  const r = documentRect(f);
  if (!r) return null;
  const docW = document.documentElement.scrollWidth;
  const docH = document.documentElement.scrollHeight;
  // Off the page (e.g. left: -9999px): nowhere sensible to draw it.
  if (r.x + r.w <= 0 || r.y + r.h <= 0 || r.x >= docW || r.y >= docH) return null;
  const x = Math.max(8, r.x);
  const y = INSIDE_VISIBLE_TEXT.includes(f.technique) ? r.y + r.h + 2 : Math.max(0, r.y);
  const room = Math.max(MIN_WIDTH, docW - x - 8);
  let width = Math.min(Math.max(r.w, blockWidth(f), MIN_WIDTH), room);
  const el = resolveElement(f);
  const parent = el?.parentElement;
  // Text that sits inside a line (display:none, measured where it would be) stops at its block's edge.
  if (f.technique === "display_none" && parent) {
    const right = parent.getBoundingClientRect().right + window.scrollX;
    width = Math.max(r.w + 8, Math.min(width, right - x - 8));
  }
  let font: Placed["font"];
  if (el?.closest("pre, code") && parent) {
    const cs = getComputedStyle(parent);
    font = { family: cs.fontFamily, size: cs.fontSize };
  }
  return { finding: f, rect: { x, y, w: r.w, h: r.h }, width, font };
}
