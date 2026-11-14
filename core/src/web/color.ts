// Color parsing and WCAG contrast, pure functions (no DOM).

export type RGBA = { r: number; g: number; b: number; a: number };

/**
 * Parses computed-style colors. Browsers normalize to rgb()/rgba(), and newer ones may
 * return color(srgb r g b / a) for some inputs, so we handle both. Returns null if unknown.
 */
export function parseColor(value: string): RGBA | null {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const rgb = v.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    const [r, g, b] = parts.slice(0, 3).map(Number);
    const a = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
    return [r, g, b, a].some(Number.isNaN) ? null : { r, g, b, a };
  }

  const srgb = v.match(/^color\(srgb\s+([^)]+)\)$/);
  if (srgb) {
    const parts = srgb[1].split(/[\s/]+/).filter(Boolean);
    const [r, g, b] = parts.slice(0, 3).map((p) => Number(p) * 255);
    const a = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
    return [r, g, b, a].some(Number.isNaN) ? null : { r, g, b, a };
  }
  return null;
}

const parseAlpha = (s: string) => (s.endsWith("%") ? Number(s.slice(0, -1)) / 100 : Number(s));

/** Paint `top` over an opaque `bottom` (standard alpha compositing). */
export function composite(top: RGBA, bottom: RGBA): RGBA {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

/** WCAG 2 relative luminance of an opaque color. */
export function luminance({ r, g, b }: RGBA): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(fg: RGBA, bg: RGBA): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
