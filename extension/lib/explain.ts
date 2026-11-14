import type { Finding, Technique } from "@hiddenink/core";

// Plain-language template text for the hover cards and modals.
// Stage 2 will replace these with Gemini-written explanations.

export const TECHNIQUE_INFO: Record<Technique, { label: string; how: string }> = {
  low_contrast: { label: "Invisible color", how: "The text is almost the same color as its background." },
  tiny_font: { label: "Microscopic text", how: "The font is only a few pixels tall, far too small to read." },
  transparent: { label: "Transparent text", how: "The text is fully transparent, so it never shows up." },
  offscreen: { label: "Off-screen text", how: "The text is positioned outside the visible page." },
  clipped: { label: "Clipped text", how: "The text sits in a box with no size, so it is cut away." },
  display_none: { label: "Hidden element", how: "The element is hidden from the page layout." },
  attr_text: { label: "Hidden in an attribute", how: "The text lives in alt text, a tooltip or a label you never see." },
  html_comment: { label: "HTML comment", how: "The text is a code comment the browser never displays." },
  unicode_tags: { label: "Invisible Unicode (tags)", how: "Letters encoded as invisible Unicode tag characters." },
  zero_width: { label: "Zero-width characters", how: "Characters that take up no space on screen." },
  bidi: { label: "Text-direction trick", how: "Control characters that reorder how text is displayed." },
  variation_selectors: { label: "Emoji smuggling", how: "Bytes hidden in emoji variation selectors." },
  pdf_invisible: { label: "Invisible PDF text", how: "Text drawn in white, with no ink, or under a white shape." },
  pdf_tiny_font: { label: "Microscopic PDF text", how: "Text only a couple of points tall." },
  pdf_offpage: { label: "Off-page PDF text", how: "Text placed outside the page boundaries." },
};

/** One plain sentence on how the text is hidden, for cards and dialogs. */
export const CAUSE: Record<Technique, string> = {
  low_contrast: "Hidden as text the same color as its background.",
  tiny_font: "Hidden as text too small to see.",
  transparent: "Hidden as fully transparent text.",
  offscreen: "Hidden by moving it off the edge of the page.",
  clipped: "Hidden inside a box with no size.",
  display_none: "Hidden from the page layout.",
  attr_text: "Hidden in an image description or tooltip.",
  html_comment: "Hidden in a code comment.",
  unicode_tags: "Hidden as invisible Unicode characters.",
  zero_width: "Hidden with zero-width characters.",
  bidi: "Hidden with text-direction control characters.",
  variation_selectors: "Hidden inside emoji variation characters.",
  pdf_invisible: "Hidden as white or invisible text in the PDF.",
  pdf_tiny_font: "Hidden as text too small to see in the PDF.",
  pdf_offpage: "Hidden outside the edge of the PDF page.",
};

export function causeLine(f: Finding): string {
  return CAUSE[f.technique];
}

/** Short lower-case label for lists, e.g. "white or invisible text", taken from TECHNIQUE_INFO. */
export function techniqueLabel(f: Finding): string {
  return TECHNIQUE_INFO[f.technique].label;
}

/** Shown instead of a percentage. Only flagged findings reach the UI, so it's High or Medium. */
export type Likelihood = "High" | "Medium";
export const HIGH_AI_SCORE = 0.75;
export function likelihood(f: Finding): Likelihood {
  return f.aiScore >= HIGH_AI_SCORE ? "High" : "Medium";
}

/** The hidden text as a human would want to read it: decoded if needed, whitespace collapsed, trimmed. */
export function whatItSays(f: Finding, max = 280): string {
  const s = (f.decoded ?? f.text).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** One friendly sentence for the card header. */
export function headline(f: Finding): string {
  return f.flagged
    ? "This text is invisible to you, but an AI reading the page would follow it."
    : "This text is hidden from you. It does not look aimed at an AI.";
}

/** Why the scorer thinks it targets an AI. The engine's reasons are already short phrases, so list them as-is. */
export function whyAi(f: Finding): string[] {
  return f.reasons.map((r) => r.trim().replace(/\.$/, "")).filter(Boolean);
}

export function flaggedOf<T extends { flagged: boolean }>(findings: T[]): T[] {
  return findings.filter((f) => f.flagged);
}

export function countLabel(n: number, noun = "hidden instruction"): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}
