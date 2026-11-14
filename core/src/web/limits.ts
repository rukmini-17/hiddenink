// Tunable thresholds for the web scanner.
export const WEB_LIMITS = {
  /** font-size below this (CSS px) is unreadable. */
  tinyFontPx: 4,
  /** WCAG contrast ratio below this means text is effectively the same color as its background. */
  minContrast: 1.3,
  /** Product of ancestor opacities below this is invisible. */
  minOpacity: 0.1,
  /** color alpha below this is invisible. */
  minColorAlpha: 0.05,
  /** display:none / collapsed text is only reported if longer than this (or AI-aimed): menus are short. */
  displayNoneMinChars: 40,
  /** Ignore hidden snippets shorter than this (icons, "×" close buttons). */
  minHiddenChars: 3,
  /** Attribute text shorter than this is never reported. */
  attrMinChars: 20,
  /** Visible area (px²) at or below this counts as clipped away. */
  clippedMaxArea: 2,
  /** Text further right than this many viewport widths counts as offscreen even if scrollable. */
  offscreenViewports: 3,
} as const;
