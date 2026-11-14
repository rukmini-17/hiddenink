import type { Finding, Technique } from "@hiddenink/core";

// Where to draw each revealed line, in document CSS px (the page's top-left is 0,0).
//
// `core` gives `location.bbox` as [x, y, w, h] in document px. When a finding has no usable bbox we
// fall back to the live rect of `location.selector`. Findings with no box on the page (comments,
// display:none, text moved off-screen) can't be drawn in place and are only listed.

export type DocRect = { x: number; y: number; w: number; h: number };
export type Placed = { finding: Finding; rect: DocRect; width: number };

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

function documentRect(f: Finding): DocRect | null {
  const b = f.location.bbox;
  if (b && b[2] >= 1 && b[3] >= 1) return { x: b[0], y: b[1], w: b[2], h: b[3] };
  const r = resolveElement(f)?.getBoundingClientRect();
  if (r && r.width >= 1 && r.height >= 1) return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  return null;
}

export function place(f: Finding): Placed | null {
  const r = documentRect(f);
  if (!r) return null;
  const docW = document.documentElement.scrollWidth;
  const docH = document.documentElement.scrollHeight;
  // Off the page (e.g. left: -9999px): nowhere sensible to draw it.
  if (r.x + r.w <= 0 || r.y + r.h <= 0 || r.x >= docW || r.y >= docH) return null;
  const x = Math.max(8, r.x);
  const y = INSIDE_VISIBLE_TEXT.includes(f.technique) ? r.y + r.h + 2 : Math.max(0, r.y);
  const room = Math.max(MIN_WIDTH, docW - x - 8);
  const width = Math.min(Math.max(r.w, MIN_WIDTH), room);
  return { finding: f, rect: { x, y, w: r.w, h: r.h }, width };
}
