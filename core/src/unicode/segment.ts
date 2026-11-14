// Splits text into visible stretches and invisible runs, deciding which runs are legitimate.
// Both scanUnicode (what to report) and cleanText (what to keep) use this, so they always agree.

import {
  BLACK_FLAG, BOM, TAG_CANCEL, ZWJ, ZWNJ,
  isBidi, isControl, isEmojiPart, isFlagTag, isNonLatinLetter, isTag, isVariationSelector, isZeroWidth,
} from "./chars";
import { UNICODE_LIMITS } from "./limits";

export type SegmentKind =
  // kept by cleanText, never reported
  | "visible"
  | "flag"          // tag letters + cancel tag after U+1F3F4 (England/Scotland/Wales flags)
  | "joiner"        // ZWJ in an emoji sequence, or ZWJ/ZWNJ inside a non-Latin word
  | "emoji_vs"      // a short run of variation selectors (normal after emoji)
  // removed by cleanText, never reported
  | "bom"           // a single leading byte-order mark
  | "control"       // C0/C1 control characters and DEL (junk, not an attack technique)
  // removed by cleanText and reported
  | "unicode_tags" | "zero_width" | "bidi" | "variation_selectors";

export type Segment = { kind: SegmentKind; codePoints: number[] };

export const KEPT_KINDS: ReadonlySet<SegmentKind> = new Set(["visible", "flag", "joiner", "emoji_vs"]);

export function segment(text: string): Segment[] {
  const cps = Array.from(text, (c) => c.codePointAt(0)!);
  const out: Segment[] = [];

  const push = (kind: SegmentKind, from: number, to: number) => {
    const last = out[out.length - 1];
    const slice = cps.slice(from, to);
    if (kind === "visible" && last?.kind === "visible") last.codePoints.push(...slice);
    else out.push({ kind, codePoints: slice });
  };
  /** End index of the run starting at i whose code points all satisfy pred. */
  const runEnd = (i: number, pred: (cp: number) => boolean) => {
    let j = i;
    while (j < cps.length && pred(cps[j])) j++;
    return j;
  };

  let i = 0;
  while (i < cps.length) {
    const cp = cps[i];

    if (i === 0 && cp === BOM) {
      push("bom", 0, 1);
      i = 1;
    } else if (isTag(cp)) {
      const flagEnd = cps[i - 1] === BLACK_FLAG ? matchFlag(cps, i) : -1;
      if (flagEnd > 0) {
        push("flag", i, flagEnd);
        i = flagEnd;
      } else {
        const j = runEnd(i, isTag);
        push("unicode_tags", i, j);
        i = j;
      }
    } else if (isZeroWidth(cp)) {
      const j = runEnd(i, isZeroWidth);
      push(isLegitJoiner(cps, i, j) ? "joiner" : "zero_width", i, j);
      i = j;
    } else if (isBidi(cp)) {
      const j = runEnd(i, isBidi);
      push("bidi", i, j);
      i = j;
    } else if (isControl(cp)) {
      const j = runEnd(i, isControl);
      push("control", i, j);
      i = j;
    } else if (isVariationSelector(cp)) {
      const j = runEnd(i, isVariationSelector);
      push(j - i < UNICODE_LIMITS.variationSelectorMinRun ? "emoji_vs" : "variation_selectors", i, j);
      i = j;
    } else {
      push("visible", i, i + 1);
      i++;
    }
  }
  return out;
}

/** If cps[start..] is "tag letters/digits + cancel tag", return the index after the cancel tag. */
function matchFlag(cps: number[], start: number): number {
  let j = start;
  while (j < cps.length && isFlagTag(cps[j])) j++;
  const letters = j - start;
  // Region codes are like "gbeng": 2-letter country + up to 3 more.
  return cps[j] === TAG_CANCEL && letters >= 2 && letters <= 6 ? j + 1 : -1;
}

/** A lone ZWJ between emoji parts, or a lone ZWJ/ZWNJ between non-Latin letters, is normal. */
function isLegitJoiner(cps: number[], start: number, end: number): boolean {
  if (end - start !== 1) return false;
  const cp = cps[start];
  const prev = cps[start - 1];
  const next = cps[end];
  if (cp === ZWJ && isEmojiPart(prev) && isEmojiPart(next)) return true;
  return (cp === ZWJ || cp === ZWNJ) && isNonLatinLetter(prev) && isNonLatinLetter(next);
}
