// Small DOM helpers shared by the web detectors.

/** getComputedStyle is slow to call repeatedly; cache per element for one scan. */
export class StyleCache {
  private cache = new Map<Element, CSSStyleDeclaration>();
  constructor(private win: Window) {}
  get(el: Element): CSSStyleDeclaration {
    let s = this.cache.get(el);
    if (!s) {
      s = this.win.getComputedStyle(el);
      this.cache.set(el, s);
    }
    return s;
  }
}

/** el, its parent, …, up to (and including) <html>. */
export function* ancestors(el: Element | null): Generator<Element> {
  for (let cur = el; cur; cur = cur.parentElement) yield cur;
}

export const isInline = (s: CSSStyleDeclaration) => s.display.startsWith("inline") || s.display === "contents";

/**
 * Inherited properties like color and font-size make <b>/<span> children look like separate hidden
 * snippets. Climb through inline ancestors that share the same value so one hidden sentence = one finding.
 */
export function climbInline(el: Element, styles: StyleCache, prop: string): Element {
  let cur = el;
  const value = styles.get(el).getPropertyValue(prop);
  while (cur.parentElement && isInline(styles.get(cur))) {
    const parent = cur.parentElement;
    if (styles.get(parent).getPropertyValue(prop) !== value || parent === el.ownerDocument.body) break;
    cur = parent;
  }
  return cur;
}

export type Box = { left: number; top: number; right: number; bottom: number };

export const area = (b: Box) => Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);

export const intersect = (a: Box, b: Box): Box => ({
  left: Math.max(a.left, b.left),
  top: Math.max(a.top, b.top),
  right: Math.min(a.right, b.right),
  bottom: Math.min(a.bottom, b.bottom),
});

export function unionBoxes(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((u, b) => ({
    left: Math.min(u.left, b.left),
    top: Math.min(u.top, b.top),
    right: Math.max(u.right, b.right),
    bottom: Math.max(u.bottom, b.bottom),
  }));
}

/** Bounding box of a text node's rendered glyphs, in viewport coordinates. */
export function textBox(node: Text): Box {
  const range = node.ownerDocument.createRange();
  range.selectNodeContents(node);
  const r = range.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

/** Short, stable CSS selector for an element: #id when unique, else a tag:nth-of-type path. */
export function cssSelector(el: Element): string {
  const doc = el.ownerDocument;
  const parts: string[] = [];
  for (let cur: Element | null = el; cur && cur !== doc.documentElement; cur = cur.parentElement) {
    if (cur.id && doc.querySelectorAll(`#${CSS.escape(cur.id)}`).length === 1) {
      parts.unshift(`#${CSS.escape(cur.id)}`);
      return parts.join(" > ");
    }
    const tag = cur.tagName.toLowerCase();
    const siblings = cur.parentElement
      ? Array.from(cur.parentElement.children).filter((c) => c.tagName === cur!.tagName)
      : [];
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(cur) + 1})` : tag);
  }
  return parts.join(" > ");
}
