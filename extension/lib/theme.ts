// Light or dark for our dialogs. Extension pages follow the system; dialogs on a website follow that page.

export function systemIsDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Popup and settings page: put the theme on <body> so the page background matches too. */
export function applyExtensionPageTheme(): void {
  const apply = () => {
    document.body.classList.add("hi-root", "bg-hi-bg");
    document.body.classList.toggle("hi-dark", systemIsDark());
  };
  apply();
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", apply);
}

function parseRgb(css: string): { r: number; g: number; b: number; a: number } | null {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
  return { r: +r, g: +g, b: +b, a: +a };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Does the website under our dialog look dark? First opaque background on <body> or <html>,
 * then the page's declared color-scheme, then the system setting.
 */
export function pageIsDark(doc: Document = document): boolean {
  for (const el of [doc.body, doc.documentElement]) {
    if (!el) continue;
    const bg = parseRgb(getComputedStyle(el).backgroundColor);
    if (bg && bg.a > 0.5) return luminance(bg) < 0.2;
  }
  const scheme = getComputedStyle(doc.documentElement).colorScheme;
  if (scheme.includes("dark") && !scheme.includes("light")) return true;
  if (scheme.includes("light") && !scheme.includes("dark")) return false;
  return systemIsDark();
}
