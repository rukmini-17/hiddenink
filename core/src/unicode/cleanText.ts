import { fromCodePoints } from "./chars";
import { KEPT_KINDS, segment } from "./segment";

/** CRLF, CR, form feed, vertical tab, NEL, and the Unicode line/paragraph separators. */
const LINE_BREAKS = /\r\n?|[\f\v\u0085\u2028\u2029]/g;

/**
 * Remove invisible Unicode (tags, zero-width, bidi controls, variation-selector runs) and control
 * characters. Every kind of line break becomes "\n"; tab and newline are the only controls left.
 * Keeps what's legitimate: subdivision flags, ZWJ in emoji / non-Latin words, a single emoji selector.
 */
export function cleanText(text: string): string {
  return segment(text.replace(LINE_BREAKS, "\n"))
    .filter((s) => KEPT_KINDS.has(s.kind))
    .map((s) => fromCodePoints(s.codePoints))
    .join("");
}
