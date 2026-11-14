import { fromCodePoints } from "./chars";
import { KEPT_KINDS, segment } from "./segment";

/**
 * Remove invisible Unicode (tags, zero-width, bidi controls, variation-selector runs).
 * Keeps what's legitimate: subdivision flags, ZWJ in emoji / non-Latin words, a single emoji selector.
 */
export function cleanText(text: string): string {
  return segment(text)
    .filter((s) => KEPT_KINDS.has(s.kind))
    .map((s) => fromCodePoints(s.codePoints))
    .join("");
}
