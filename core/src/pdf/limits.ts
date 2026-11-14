// Tunable thresholds for the PDF scanner.
export const PDF_LIMITS = {
  /** Render pages at this scale for pixel sampling (2 = 144 dpi). */
  renderScale: 2,
  /** A pixel counts as "ink" if any channel differs from the box's main color by more than this (0–255).
   *  32 ≈ the web engine's 1.3 contrast cutoff, so near-white-on-white counts as no ink. */
  inkChannelDelta: 32,
  /** A text box with less than this fraction of ink pixels shows nothing a person can read. */
  minInkFraction: 0.01,
  /** Glyph height below this (points) is unreadable. */
  tinyFontPt: 3,
  /** Top/bottom margin (fraction of page height) where tiny headers/footers are normal. */
  marginFraction: 0.08,
  /** An image covering at least this fraction of the page makes it a "scanned" page. */
  scanImageCoverage: 0.6,
} as const;
