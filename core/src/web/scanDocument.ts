// Web engine on a live, laid-out DOM (X-ray mode, Playwright eval).

import type { ScanOptions, ScanResult } from "../types";
import { DEFAULT_THRESHOLD } from "../scorer/config";
import { classifyTextNode } from "./classify";
import { isInline, StyleCache } from "./dom";
import { runWebScan } from "./engine";

export function scanDocument(doc: Document, opts?: ScanOptions): ScanResult {
  const win = doc.defaultView!;
  const styles = new StyleCache(win);
  return runWebScan(doc, {
    threshold: opts?.threshold ?? DEFAULT_THRESHOLD,
    classify: (node) => classifyTextNode(node, styles),
    isInline: (el) => isInline(styles.get(el)),
    scroll: { x: win.scrollX, y: win.scrollY },
  });
}
