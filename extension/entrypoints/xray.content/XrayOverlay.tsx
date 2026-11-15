import type { Finding } from "@hiddenink/core";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { XRAY_PLAIN_DIM_HOSTS } from "@/lib/config";
import { flaggedOf, whatItSays } from "@/lib/explain";
import { AllList } from "./AllList";
import { HiddenTextCard } from "./HiddenTextCard";
import { place, type Placed } from "./placement";
import { TopBar } from "./TopBar";

// X-ray: a dim layer that recolours the page behind it, and a separate layer that draws a glowing
// copy of each hidden line where the real text sits. The page itself is never edited.
// Nothing opens on its own: a small top bar shows the count, clicking a line opens its card,
// and "View all" lists everything (including lines that can't be drawn in place).
//
// The reveal layer's origin is the document's top-left and it scrolls with the page like normal
// content, so document coordinates from `core` are used as-is with no scroll listeners.

const CARD_W = 380;
const GAP = 16;

type Open = { kind: "card"; id: string; at?: { left: number; top: number } } | { kind: "list" } | null;

/**
 * Offset that moves an absolutely positioned box inside our shadow host to the document origin.
 * `probe` is an empty box at left/top 0 of the same containing block; we measure where it lands.
 */
function useDocumentOrigin(probe: React.RefObject<HTMLDivElement>, deps: unknown[]) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const r = probe.current?.getBoundingClientRect();
    if (r) setOrigin({ x: -(r.left + window.scrollX), y: -(r.top + window.scrollY) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return origin;
}

/** Card position in document px: beside the line if it fits, otherwise under it at the right edge of the window. */
function cardPosition(p: Placed, lineHeight: number): { left: number; top: number } {
  const viewLeft = window.scrollX + GAP;
  const viewRight = window.scrollX + window.innerWidth - GAP;
  const right = p.rect.x + p.width + GAP;
  if (right + CARD_W <= viewRight) return { left: right, top: p.rect.y - 8 };
  const left = p.rect.x - GAP - CARD_W;
  if (left >= viewLeft) return { left, top: p.rect.y - 8 };
  return { left: Math.max(viewLeft, viewRight - CARD_W), top: p.rect.y + lineHeight + 10 };
}

export function XrayOverlay({ findings, visibleText, onClose }: { findings: Finding[]; visibleText: string; onClose: () => void }) {
  const flagged = useMemo(() => flaggedOf(findings), [findings]);
  const placed = useMemo(() => flagged.flatMap((f) => place(f) ?? []), [flagged]);
  const placedIds = useMemo(() => new Set(placed.map((p) => p.finding.id)), [placed]);

  const probeRef = useRef<HTMLDivElement>(null);
  const origin = useDocumentOrigin(probeRef, [findings]);
  const cardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<string, HTMLDivElement>());

  const [open, setOpen] = useState<Open>(null);

  // Two hidden lines can sit close together while their glowing copies (15px text) are taller than
  // the originals. After drawing, push any copy that would overlap the one above it down.
  const [tops, setTops] = useState<Map<string, number>>(new Map());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    let prevBottom = -Infinity;
    for (const p of [...placed].sort((a, b) => a.rect.y - b.rect.y)) {
      const h = lineRefs.current.get(p.finding.id)?.offsetHeight ?? 22;
      const top = Math.max(p.rect.y, prevBottom + 4);
      next.set(p.finding.id, top);
      prevBottom = top + h;
    }
    setTops(next);
  }, [placed]);
  const topOf = (p: Placed) => tops.get(p.finding.id) ?? p.rect.y;
  const plainDim = XRAY_PLAIN_DIM_HOSTS.includes(location.hostname);

  // A new scan (resize) invalidates whatever was open.
  useEffect(() => setOpen(null), [findings]);

  // Escape or a click elsewhere closes the card or list (X-ray stays on).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onDown = (e: MouseEvent) => {
      const path = e.composedPath();
      const inside = [cardRef.current, listRef.current, ...lineRefs.current.values()].some((el) => el && path.includes(el));
      if (!inside) setOpen(null);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousedown", onDown, true);
    };
  }, [open]);

  // A card opened near the bottom of the window would be cut off: scroll just enough to show it.
  useEffect(() => {
    if (open?.kind === "card" && open.at) cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  function openCard(f: Finding) {
    const p = placed.find((x) => x.finding.id === f.id);
    if (!p) return setOpen({ kind: "card", id: f.id }); // not on the page: card floats under the top bar
    const h = lineRefs.current.get(f.id)?.offsetHeight ?? 22;
    setOpen({ kind: "card", id: f.id, at: cardPosition({ ...p, rect: { ...p.rect, y: topOf(p) } }, h) });
  }

  function pickFromList(f: Finding) {
    const p = placed.find((x) => x.finding.id === f.id);
    if (p) {
      window.scrollTo({ top: Math.max(0, topOf(p) - window.innerHeight / 3), behavior: "instant" as ScrollBehavior });
    }
    openCard(f);
  }

  const cardFinding = open?.kind === "card" ? flagged.find((f) => f.id === open.id) : undefined;
  const activeId = open?.kind === "card" ? open.id : null;

  return (
    <div className="hi-root hi-dark">
      <div className={`hi-dim z-0 ${plainDim ? "hi-dim-plain" : ""}`} />

      {/* Reveal layer: document coordinates, scrolls with the page. */}
      <div ref={probeRef} className="pointer-events-none absolute left-0 top-0 h-0 w-0" />
      <div className="pointer-events-none absolute z-10 h-0 w-0" style={origin ? { left: origin.x, top: origin.y } : { visibility: "hidden" }}>
        {placed.map((p) => (
          <div
            key={p.finding.id}
            ref={(el) => {
              if (el) lineRefs.current.set(p.finding.id, el);
              else lineRefs.current.delete(p.finding.id);
            }}
            className="hi-reveal"
            role="button"
            tabIndex={0}
            data-hiddenink-id={p.finding.id}
            data-active={activeId === p.finding.id}
            style={{ left: p.rect.x, top: topOf(p), width: p.width, ...(p.font && { fontFamily: p.font.family, fontSize: p.font.size }) }}
            onClick={() => openCard(p.finding)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openCard(p.finding)}
          >
            {whatItSays(p.finding, 400)}
          </div>
        ))}
        {cardFinding && open?.kind === "card" && open.at && (
          <HiddenTextCard ref={cardRef} finding={cardFinding} visibleText={visibleText} onPage total={flagged.length} onViewAll={() => setOpen({ kind: "list" })} onClose={() => setOpen(null)} className="absolute z-20" style={{ left: open.at.left, top: open.at.top }} />
        )}
      </div>

      {cardFinding && open?.kind === "card" && !open.at && (
        <HiddenTextCard ref={cardRef} finding={cardFinding} visibleText={visibleText} onPage={false} total={flagged.length} onViewAll={() => setOpen({ kind: "list" })} onClose={() => setOpen(null)} className="fixed right-4 top-16 z-40" />
      )}

      <TopBar count={flagged.length} onViewAll={() => setOpen({ kind: "list" })} onClose={onClose} />

      {open?.kind === "list" && (
        <div ref={listRef}>
          <AllList findings={flagged} placedIds={placedIds} onPick={pickFromList} onClose={() => setOpen(null)} />
        </div>
      )}
    </div>
  );
}
