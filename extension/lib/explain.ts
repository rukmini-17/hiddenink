import type { Finding, Technique } from "@hiddenink/core";

// Plain-language template text for the X-ray card and the guard dialogs.
// Stage 2 will replace these with Gemini-written explanations.

export const TECHNIQUE_INFO: Record<Technique, { label: string }> = {
  low_contrast: { label: "Invisible color" },
  tiny_font: { label: "Microscopic text" },
  transparent: { label: "Transparent text" },
  offscreen: { label: "Off-screen text" },
  clipped: { label: "Clipped text" },
  display_none: { label: "Hidden element" },
  attr_text: { label: "Hidden in an attribute" },
  html_comment: { label: "HTML comment" },
  unicode_tags: { label: "Invisible Unicode (tags)" },
  zero_width: { label: "Zero-width characters" },
  bidi: { label: "Text-direction trick" },
  variation_selectors: { label: "Emoji smuggling" },
  pdf_invisible: { label: "Invisible PDF text" },
  pdf_tiny_font: { label: "Microscopic PDF text" },
  pdf_offpage: { label: "Off-page PDF text" },
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

/** Short name of the hiding trick for lists, e.g. "Invisible color". */
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

export function flaggedOf<T extends { flagged: boolean }>(findings: T[]): T[] {
  return findings.filter((f) => f.flagged);
}


// Package names the hidden text asks for. Plain pattern matching, no AI: install commands
// ("pip install x"), "the package x", and "x to requirements.txt".
const PKG_PATTERNS = [
  /\b(?:pip3?|uv\s+pip|poetry|pipenv|npm|pnpm|yarn|bun)\s+(?:install|add|i)\s+([^\n.;,]+)/gi,
  /\b(?:package|library|module|dependency|plugin)\s+(?:called\s+|named\s+)?[`'"“]?([a-z@][\w.@/-]*[\w])/gi,
  /[`'"“]?\b([a-z][\w.-]*[\w])[`'"”]?\s+to\s+(?:your\s+)?(?:requirements\.txt|package\.json|pyproject\.toml)/gi,
];
const NOT_A_PACKAGE = new Set(["it", "this", "that", "them", "the", "a", "an", "and", "or", "to", "is", "manager", "first", "also", "then", "too"]);

function packageNames(text: string): string[] {
  const names = new Set<string>();
  for (const re of PKG_PATTERNS) {
    for (const m of text.matchAll(re)) {
      for (const raw of m[1].split(/\s+/)) {
        if (raw.startsWith("-")) continue; // flags such as -U, --upgrade
        const name = raw.replace(/^[`'"“]+|[`'"”]+$/g, "").replace(/(?:==|>=|<=|~=|\^|@\d).*$/, "").toLowerCase();
        if (/^[a-z@][\w.@/-]*$/.test(name) && !NOT_A_PACKAGE.has(name)) names.add(name);
      }
    }
  }
  return [...names];
}

/** Packages the hidden text asks for that the page's visible text never mentions. */
export function unmentionedPackages(f: Finding, visibleText: string): string[] {
  const seen = visibleText.toLowerCase();
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return packageNames(f.decoded ?? f.text).filter((p) => !new RegExp(`(^|[^\\w-])${esc(p)}($|[^\\w-])`).test(seen));
}

/** The unmentioned package names as one phrase ("a", "a and b"), or null if there are none. */
export function askedPackagesPhrase(f: Finding, visibleText: string): string | null {
  const pkgs = unmentionedPackages(f, visibleText);
  if (pkgs.length === 0) return null;
  const list = pkgs.length === 1 ? pkgs[0] : `${pkgs.slice(0, -1).join(", ")} and ${pkgs[pkgs.length - 1]}`;
  return list;
}
