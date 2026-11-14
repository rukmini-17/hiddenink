// Non-text-node places an AI reads but a person doesn't see: attributes and HTML comments.
// These are everywhere on normal pages, so they're only reported when the text is AI-aimed.

import type { Finding, Technique } from "../types";
import { scoreAiAimed } from "../scorer/score";
import { scanUnicode } from "../unicode/scanUnicode";
import { cssSelector } from "./dom";
import { WEB_LIMITS as L } from "./limits";

const ATTRS: Record<string, string> = {
  alt: "image alt text, shown only if the image fails to load",
  title: "a tooltip attribute you'd only see on hover",
  "aria-label": "an accessibility label that isn't displayed",
  "aria-description": "an accessibility description that isn't displayed",
};
const META_SELECTOR = 'meta[name="description" i], meta[property="og:description" i], meta[name="twitter:description" i]';

export function scanAttributes(doc: Document, threshold: number): Finding[] {
  const out: Finding[] = [];
  const selector = Object.keys(ATTRS).map((a) => `[${a}]`).join(",");

  for (const el of doc.querySelectorAll(selector)) {
    for (const [attr, where] of Object.entries(ATTRS)) {
      const value = el.getAttribute(attr);
      if (value) out.push(...attrFindings(value, el, `written in ${where}`, threshold));
    }
  }
  for (const meta of doc.querySelectorAll(META_SELECTOR)) {
    const value = meta.getAttribute("content");
    if (value) out.push(...attrFindings(value, meta, "written in the page's hidden description metadata", threshold));
  }
  return out;
}

function attrFindings(value: string, el: Element, where: string, threshold: number): Finding[] {
  const location = { selector: cssSelector(el) };
  const out: Finding[] = scanUnicode(value).map((f) => ({ ...f, location }));
  if (value.trim().length >= L.attrMinChars && scoreAiAimed(value).score >= threshold) {
    out.push(finding("attr_text", value.trim(), location, `invisible to you: ${where}`));
  }
  return out;
}

export function scanComments(doc: Document, threshold: number): Finding[] {
  const out: Finding[] = [];
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.nodeValue ?? "").trim();
    const parent = n.parentElement;
    const location = parent ? { selector: cssSelector(parent) } : {};
    out.push(...scanUnicode(text).map((f) => ({ ...f, location })));
    if (text && scoreAiAimed(text).score >= threshold) {
      out.push(finding("html_comment", text, location, "invisible to you: written in an HTML comment, which browsers never display"));
    }
  }
  return out;
}

function finding(technique: Technique, text: string, location: Finding["location"], reason: string): Finding {
  return { id: "", technique, text, location, aiScore: 0, flagged: false, reasons: [reason] };
}
