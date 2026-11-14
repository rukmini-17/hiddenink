// Shared web-scan pipeline. A "classifier" decides if one text node is hidden; this module
// groups hidden nodes into findings, applies the false-alarm exceptions, adds attribute,
// comment and Unicode findings, scores everything and builds visibleText.
// Used by scanDocument (live DOM, real layout) and scanClipboardHtml (inline styles only).

import type { Finding, ScanResult } from "../types";
import { applyScore } from "../scorer/applyScore";
import { scoreAiAimed } from "../scorer/score";
import { cleanText } from "../unicode/cleanText";
import { scanUnicode } from "../unicode/scanUnicode";
import type { Hiding } from "./classify";
import { area, cssSelector, unionBoxes, type Box } from "./dom";
import { WEB_LIMITS as L } from "./limits";
import { scanAttributes, scanComments } from "./sources";
import { VisibleTextBuilder } from "./visibleText";

export type Classifier = (node: Text) => { hiding: Hiding | null; box?: Box };

export type EngineOptions = {
  threshold: number;
  classify: Classifier;
  isInline: (el: Element) => boolean;
  /** Page scroll offset, to report bbox in document coordinates (absent: no layout, no bbox). */
  scroll?: { x: number; y: number };
};

/** Text inside these isn't rendered page text (SVG text is a known gap, see ARCHITECTURE.md). */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "IFRAME", "OBJECT", "SVG"]);
/** Native dropdowns have zero-size options until opened; treat their text as visible. */
const DROPDOWN = "option, optgroup, select, datalist";

type Group = { hiding: Hiding; texts: string[]; boxes: Box[] };

export function runWebScan(doc: Document, opts: EngineOptions): ScanResult {
  const groups = new Map<Element, Map<string, Group>>();
  const visible = new VisibleTextBuilder(opts.isInline);
  const raw: Finding[] = [];

  for (const node of textNodes(doc)) {
    const el = node.parentElement!;
    // Invisible Unicode can hide inside perfectly visible text, so check every node.
    for (const f of scanUnicode(node.data)) raw.push({ ...f, location: { selector: cssSelector(el) } });

    const { hiding, box } = el.closest(DROPDOWN) ? { hiding: null } : opts.classify(node);
    if (!hiding) {
      visible.add(node);
      continue;
    }
    const byTechnique = groups.get(hiding.element) ?? new Map<string, Group>();
    groups.set(hiding.element, byTechnique);
    const group = byTechnique.get(hiding.technique) ?? { hiding, texts: [], boxes: [] };
    byTechnique.set(hiding.technique, group);
    group.texts.push(node.data);
    if (box && hiding.technique !== "display_none") group.boxes.push(box);
  }

  for (const byTechnique of groups.values()) {
    for (const group of byTechnique.values()) {
      const finding = hiddenTextFinding(group, opts);
      if (finding) raw.push(finding);
    }
  }
  raw.push(...scanAttributes(doc, opts.threshold), ...scanComments(doc, opts.threshold));

  const findings = raw
    .map((f) => applyScore(f, opts.threshold))
    .map((f, i) => ({ ...f, id: `w${i}-${f.technique}` }));
  return { findings, visibleText: cleanText(visible.toString()) };
}

/** Turn one group of hidden text nodes into a finding, applying the false-alarm exceptions. */
function hiddenTextFinding(group: Group, opts: EngineOptions): Finding | null {
  const text = group.texts.join(" ").replace(/\s+/g, " ").trim();
  if (text.length < L.minHiddenChars) return null;

  const { hiding } = group;
  const aiAimed = scoreAiAimed(text).score >= opts.threshold;
  // Screen-reader-only text is accessibility, not an attack, unless it talks to an AI.
  if (hiding.srOnly && !aiAimed) return null;
  // Menus, tabs and modals are display:none all the time; only long or AI-aimed text matters.
  if (hiding.technique === "display_none" && text.length <= L.displayNoneMinChars && !aiAimed) return null;

  const reason = hiding.srOnly
    ? "uses the screen-reader-only pattern (normally for accessibility), but the text looks aimed at an AI"
    : `invisible to you: ${hiding.reason}`;
  return {
    id: "",
    technique: hiding.technique,
    text,
    location: { selector: cssSelector(hiding.element), ...bboxOf(group.boxes, opts.scroll) },
    aiScore: 0, // filled in by applyScore with every other finding
    flagged: false,
    reasons: [reason],
  };
}

/** Union of the text boxes in document coordinates (CSS px): [x, y, width, height]. */
function bboxOf(boxes: Box[], scroll: EngineOptions["scroll"]): { bbox?: [number, number, number, number] } {
  const u = unionBoxes(boxes);
  if (!u || !scroll || (area(u) === 0 && u.left === 0 && u.top === 0)) return {};
  return { bbox: [u.left + scroll.x, u.top + scroll.y, u.right - u.left, u.bottom - u.top] };
}

function* textNodes(doc: Document): Generator<Text> {
  if (!doc.body) return;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      for (let cur = node.parentElement; cur; cur = cur.parentElement) {
        if (SKIP_TAGS.has(cur.tagName.toUpperCase())) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) yield n as Text;
}
