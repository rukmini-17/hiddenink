// Reports invisible-Unicode findings in a string. Shared by paste guard, web and PDF scanners.

import type { Finding, Technique } from "../types";
import { fromCodePoints, isBidiOverride } from "./chars";
import { decodeTags, decodeVariationSelectors, decodeZeroWidthBinary, isReadable } from "./decode";
import { UNICODE_LIMITS } from "./limits";
import { segment, type Segment } from "./segment";

/**
 * @param idPrefix keeps ids unique when callers scan many strings (e.g. one per DOM node).
 *
 * aiScore is left at 0 here: the R3 scorer fills it in from `decoded`/`text`.
 * `flagged` reflects techniques that are suspicious on their own.
 */
export function scanUnicode(text: string, idPrefix = "u"): Finding[] {
  const findings: Finding[] = [];
  const add = (technique: Technique, cps: number[], flagged: boolean, reasons: string[], decoded?: string) => {
    findings.push({
      id: `${idPrefix}-${technique}-${findings.length}`,
      technique,
      text: fromCodePoints(cps),
      ...(decoded !== undefined && { decoded }),
      location: {},
      aiScore: 0,
      flagged,
      reasons,
    });
  };

  const strayZeroWidth: number[] = [];

  for (const seg of segment(text)) {
    switch (seg.kind) {
      case "unicode_tags":
        reportTags(seg, add);
        break;
      case "zero_width":
        if (seg.codePoints.length >= UNICODE_LIMITS.zeroWidthMinRun) reportZeroWidth(seg.codePoints, "run", add);
        else strayZeroWidth.push(...seg.codePoints);
        break;
      case "bidi":
        reportBidi(seg, add);
        break;
      case "variation_selectors":
        reportVariationSelectors(seg, add);
        break;
    }
  }

  // One or two stray zero-width chars are harmless; many sprinkled through text is a hiding pattern.
  if (strayZeroWidth.length >= UNICODE_LIMITS.zeroWidthScatteredMin) {
    reportZeroWidth(strayZeroWidth, "scattered", add);
  }
  return findings;
}

type Add = (technique: Technique, cps: number[], flagged: boolean, reasons: string[], decoded?: string) => void;

function reportTags(seg: Segment, add: Add) {
  const decoded = decodeTags(seg.codePoints);
  const readable = isReadable(decoded);
  const reasons = ["hidden in invisible Unicode \"tag\" characters, which AI models can read but people can't see"];
  if (readable) reasons.push("decodes to readable text");
  add("unicode_tags", seg.codePoints, readable, reasons, decoded);
}

function reportZeroWidth(cps: number[], shape: "run" | "scattered", add: Add) {
  const decoded = shape === "run" ? decodeZeroWidthBinary(cps) : undefined;
  const reasons = [
    shape === "run"
      ? `${cps.length} invisible zero-width characters in a row`
      : `${cps.length} invisible zero-width characters scattered through the text`,
  ];
  if (decoded) reasons.push("they encode a hidden message in binary");
  add("zero_width", cps, true, reasons, decoded);
}

function reportBidi(seg: Segment, add: Add) {
  const override = seg.codePoints.some(isBidiOverride);
  const reasons = override
    ? ["forces text to display in a different order than it's stored, so you and an AI read different things"]
    : ["contains text-direction controls (normal in right-to-left languages)"];
  add("bidi", seg.codePoints, override, reasons);
}

function reportVariationSelectors(seg: Segment, add: Add) {
  const decoded = decodeVariationSelectors(seg.codePoints);
  const reasons = [`${seg.codePoints.length} invisible variation selectors in a row, a known trick to smuggle hidden data`];
  const readable = isReadable(decoded);
  if (readable) reasons.push("decodes to readable text");
  add("variation_selectors", seg.codePoints, true, reasons, readable ? decoded : undefined);
}
