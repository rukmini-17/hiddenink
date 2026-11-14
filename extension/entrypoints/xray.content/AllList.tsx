import type { Finding } from "@hiddenink/core";
import { LikelihoodBadge } from "@/components/Likelihood";
import { Brand } from "@/components/Logo";
import { causeLine, whatItSays } from "@/lib/explain";

// "View all": every flagged hidden line on the page, including ones that can't be drawn in place.
export function AllList({ findings, placedIds, onPick, onClose }: { findings: Finding[]; placedIds: Set<string>; onPick: (f: Finding) => void; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="All hidden text on this page"
      className="pointer-events-auto fixed right-4 top-16 z-40 flex max-h-[calc(100vh-80px)] w-[380px] max-w-[calc(100vw-32px)] flex-col rounded-2xl border border-hi-border bg-hi-bg text-sm text-hi-fg shadow-dialog"
    >
      <div className="flex items-start gap-2 px-5 pb-2 pt-5">
        <div className="flex-1">
          <Brand />
          <h2 className="mt-3 text-xl font-normal leading-[26px]">
            {findings.length} hidden item{findings.length === 1 ? "" : "s"} on this page
          </h2>
        </div>
        <button type="button" aria-label="Close" className="-mr-2 -mt-1 grid h-8 w-8 place-items-center rounded-full text-hi-muted hover:bg-hi-hover" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <ul className="overflow-y-auto px-3 pb-3">
        {findings.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => onPick(f)} className="w-full rounded-xl px-2 py-2.5 text-left hover:bg-hi-hover">
              <span className="line-clamp-2 text-hi-fg [overflow-wrap:anywhere]">{whatItSays(f, 300)}</span>
              <span className="mt-1 flex items-center gap-2 text-xs text-hi-muted">
                <span className="flex-1">
                  {causeLine(f)}
                  {!placedIds.has(f.id) && " Not shown on the page."}
                </span>
                <LikelihoodBadge finding={f} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
