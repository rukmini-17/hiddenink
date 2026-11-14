// Shared contract between core and the extension (and the Stage 2 server).
// Do not change without telling your teammate. Mirrored in docs/CONTRACTS.md.

export type Technique =
  // web
  | "low_contrast" | "tiny_font" | "transparent" | "offscreen" | "clipped"
  | "display_none" | "attr_text" | "html_comment"
  // unicode (web, paste, PDF)
  | "unicode_tags" | "zero_width" | "bidi" | "variation_selectors"
  // pdf
  | "pdf_invisible" | "pdf_tiny_font" | "pdf_offpage";

export type Finding = {
  id: string;
  technique: Technique;
  text: string;            // raw hidden text
  decoded?: string;        // e.g. Unicode Tags decoded into readable ASCII
  location: { selector?: string; page?: number; bbox?: [number, number, number, number] };
  aiScore: number;         // 0–1: "is this aimed at an AI?"
  flagged: boolean;        // aiScore >= threshold, or a technique that is suspicious on its own
  reasons: string[];       // human-readable, e.g. "addresses an AI assistant", "contains a link"
};

export type ScanResult = {
  findings: Finding[];
  visibleText: string;     // what a human would see (used for "clean" paste/upload and Stage 2 safe_read)
};

export type ScanOptions = {
  threshold?: number;      // aiScore at or above which a finding is flagged (default 0.5)
};
