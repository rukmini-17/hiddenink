// Tunable thresholds for the Unicode scanner, kept in one place.
export const UNICODE_LIMITS = {
  /** Consecutive zero-width chars needed to count as a hidden run. */
  zeroWidthMinRun: 3,
  /** Total stray (non-run) zero-width chars in one text that counts as "scattered" smuggling. */
  zeroWidthScatteredMin: 8,
  /** Consecutive variation selectors needed to count as smuggled bytes (1 after an emoji is normal). */
  variationSelectorMinRun: 3,
  /** Decoded text must be at least this long to count as "readable". */
  minReadableLength: 3,
} as const;
