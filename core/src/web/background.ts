import { composite, parseColor, WHITE, type RGBA } from "./color";
import { ancestors, type StyleCache } from "./dom";

/**
 * The color actually painted behind an element: walk up to the first opaque background,
 * compositing any semi-transparent ones on the way. Returns null if a background image
 * is in the way: we can't know its colors, so we skip the contrast check (no false alarms
 * on hero banners with white text over a photo).
 */
export function effectiveBackground(el: Element, styles: StyleCache): RGBA | null {
  const layers: RGBA[] = [];
  for (const node of ancestors(el)) {
    const s = styles.get(node);
    if (s.backgroundImage && s.backgroundImage !== "none") return null;
    const bg = parseColor(s.backgroundColor);
    if (bg && bg.a > 0) {
      layers.push(bg);
      if (bg.a >= 1) break;
    }
  }
  // Browsers paint a white canvas under everything by default.
  return layers.reduceRight<RGBA>((under, layer) => composite(layer, under), WHITE);
}
