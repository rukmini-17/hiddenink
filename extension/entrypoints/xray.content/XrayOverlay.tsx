import type { Finding } from "@hiddenink/core";
import { useEffect, useMemo, useState } from "react";
import { FindingCard } from "@/components/FindingCard";
import { Inky } from "@/components/Inky";
import { btn } from "@/components/Modal";
import { countLabel, flaggedOf } from "@/lib/explain";

// Dims the page, draws glowing outlines over flagged hidden text, and lists the rest in a side panel.
//
// Positions: `core` gives `location.bbox` as [x, y, w, h] in *document* CSS px (scroll already added).
// We keep document coordinates and subtract the current scroll offset on every scroll/resize frame,
// so outlines stay glued to the text while the user scrolls. When a finding has no usable bbox we fall
// back to the live rect of `location.selector`; when neither has a size it goes to the panel list only.

type DocRect = { x: number; y: number; w: number; h: number };
type Placed = { finding: Finding; doc: DocRect };
type Shown = Placed & { view: DocRect };

function resolveElement(f: Finding): Element | null {
  if (!f.location.selector) return null;
  try {
    return document.querySelector(f.location.selector);
  } catch {
    return null;
  }
}

function documentRect(f: Finding): DocRect | null {
  const b = f.location.bbox;
  if (b && b[2] >= 1 && b[3] >= 1) return { x: b[0], y: b[1], w: b[2], h: b[3] };
  const r = resolveElement(f)?.getBoundingClientRect();
  if (r && r.width >= 1 && r.height >= 1) return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  return null;
}

const toViewport = (d: DocRect): DocRect => ({ x: d.x - window.scrollX, y: d.y - window.scrollY, w: d.w, h: d.h });

export function XrayOverlay({ findings, onClose }: { findings: Finding[]; onClose: () => void }) {
  const flagged = useMemo(() => flaggedOf(findings), [findings]);
  const placed = useMemo<Placed[]>(() => flagged.flatMap((f) => { const doc = documentRect(f); return doc ? [{ finding: f, doc }] : []; }), [flagged]);
  const unplaced = useMemo(() => { const ids = new Set(placed.map((p) => p.finding.id)); return flagged.filter((f) => !ids.has(f.id)); }, [flagged, placed]);

  const [shown, setShown] = useState<Shown[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<Shown | null>(null);

  // Re-project document rects into the viewport on scroll/resize. rAF keeps it cheap.
  useEffect(() => {
    let frame = 0;
    const project = () => {
      frame = 0;
      setShown(placed.map((p) => ({ ...p, view: toViewport(p.doc) })));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(project);
    };
    project();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [placed]);

  function focus(p: Placed) {
    setActive(p.finding.id);
    window.scrollTo({ top: Math.max(0, p.doc.y + p.doc.h / 2 - window.innerHeight / 2), behavior: "smooth" });
  }

  const cardTop = (view: DocRect) => (view.y + view.h + 10 > window.innerHeight - 220 ? Math.max(8, view.y - 220) : view.y + view.h + 10);

  return (
    <div className="hi-root">
      {/* Dim layer: lets clicks and scrolling through to the page. */}
      <div className="pointer-events-none fixed inset-0 z-[2147483000] bg-ink/55" />

      {/* Glowing outlines, positioned in viewport coordinates. */}
      {shown.map((s) => (
        <button
          key={s.finding.id}
          type="button"
          aria-label="Hidden text"
          data-hiddenink-id={s.finding.id}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(null)}
          onClick={() => setActive(s.finding.id)}
          style={{ left: s.view.x - 4, top: s.view.y - 4, width: s.view.w + 8, height: Math.max(s.view.h + 8, 14) }}
          className={`hi-glow fixed z-[2147483100] rounded-md bg-amber/20 ${active === s.finding.id ? "ring-2 ring-paper" : ""}`}
        />
      ))}

      {/* Hover card next to the outline. */}
      {hover && (
        <div className="pointer-events-none fixed z-[2147483200] w-80" style={{ left: Math.min(hover.view.x, window.innerWidth - 340 - 360), top: cardTop(hover.view) }}>
          <FindingCard finding={hover.finding} />
        </div>
      )}

      {/* Side panel. */}
      <aside className="fixed bottom-4 right-4 top-4 z-[2147483300] flex w-[340px] flex-col overflow-hidden rounded-2xl bg-paper shadow-card">
        <header className="flex items-center gap-3 border-b border-paper-deep px-4 py-3">
          <Inky size={40} mood={flagged.length ? "alert" : "happy"} />
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber">X-ray</div>
            <div className="text-sm font-semibold">{flagged.length ? `${countLabel(flagged.length)} on this page` : "Nothing hidden from you here"}</div>
          </div>
          <button className={btn.quiet} onClick={onClose} aria-label="Close X-ray">
            ✕
          </button>
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {flagged.length === 0 && (
            <p className="text-sm text-ink-soft">
              The page you see and the page an AI reads look the same. {findings.length > 0 && `${findings.length} hidden snippets were found, but none looks aimed at an AI.`}
            </p>
          )}
          {placed.map((p) => (
            <FindingCard key={p.finding.id} finding={p.finding} compact active={active === p.finding.id} onClick={() => focus(p)} />
          ))}
          {unplaced.length > 0 && (
            <>
              <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Not placeable on screen</div>
              {unplaced.map((f) => (
                <FindingCard key={f.id} finding={f} active={active === f.id} onClick={() => setActive(f.id)} />
              ))}
            </>
          )}
        </div>
        <footer className="border-t border-paper-deep px-4 py-2 text-[11px] text-ink-faint">Highlighted text is invisible to you but readable by an AI. Hover a glow for details; click a card to scroll to it.</footer>
      </aside>
    </div>
  );
}
