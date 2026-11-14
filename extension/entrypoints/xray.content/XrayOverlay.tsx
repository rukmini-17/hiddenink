import type { Finding } from "@hiddenink/core";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { FindingCard } from "@/components/FindingCard";
import { Logo } from "@/components/Logo";
import { btn } from "@/components/Modal";
import { XRAY_PLAIN_DIM_HOSTS } from "@/lib/config";
import { countLabel, flaggedOf, whatItSays } from "@/lib/explain";
import { place, type Placed } from "./placement";

// X-ray: a dim layer that recolours the page behind it, and a separate layer that draws a glowing
// copy of each hidden line where the real text sits. The page itself is never edited.
//
// The reveal layer is positioned so its origin is the document's top-left, then scrolls with the page
// like normal content. No scroll listeners: document coordinates from `core` are used as-is.

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

export function XrayOverlay({ findings, onClose }: { findings: Finding[]; onClose: () => void }) {
  const flagged = useMemo(() => flaggedOf(findings), [findings]);
  const placed = useMemo(() => flagged.flatMap((f) => place(f) ?? []), [flagged]);
  const unplaced = useMemo(() => { const ids = new Set(placed.map((p) => p.finding.id)); return flagged.filter((f) => !ids.has(f.id)); }, [flagged, placed]);

  const probeRef = useRef<HTMLDivElement>(null);
  const origin = useDocumentOrigin(probeRef, [findings]);

  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<Placed | null>(null);
  const plainDim = XRAY_PLAIN_DIM_HOSTS.includes(location.hostname);

  function focus(p: Placed) {
    setActive(p.finding.id);
    window.scrollTo({ top: Math.max(0, p.rect.y + p.rect.h / 2 - window.innerHeight / 2), behavior: "smooth" });
  }

  return (
    <div className="hi-root hi-dark">
      <div className={`hi-dim z-0 ${plainDim ? "hi-dim-plain" : ""}`} />

      {/* Reveal layer: document coordinates, scrolls with the page. */}
      <div ref={probeRef} className="pointer-events-none absolute left-0 top-0 h-0 w-0" />
      <div className="pointer-events-none absolute z-10 h-0 w-0" style={origin ? { left: origin.x, top: origin.y } : { visibility: "hidden" }}>
        {placed.map((p) => (
          <div
            key={p.finding.id}
            className="hi-reveal"
            data-hiddenink-id={p.finding.id}
            data-active={active === p.finding.id}
            style={{ left: p.rect.x, top: p.rect.y, width: p.width }}
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setActive(p.finding.id)}
          >
            {whatItSays(p.finding, 400)}
          </div>
        ))}
        {hover && (
          <div className="pointer-events-none absolute z-20 w-80" style={{ left: hover.rect.x, top: hover.rect.y + Math.max(hover.rect.h, 22) + 10 }}>
            <FindingCard finding={hover.finding} />
          </div>
        )}
      </div>

      {/* Side panel (replaced by the click card and top bar in the next step). */}
      <aside className="fixed bottom-4 right-4 top-4 z-30 flex w-[340px] flex-col overflow-hidden rounded-2xl bg-paper text-ink shadow-card">
        <header className="flex items-center gap-3 border-b border-paper-deep px-4 py-3">
          <Logo size={32} />
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
      </aside>
    </div>
  );
}
