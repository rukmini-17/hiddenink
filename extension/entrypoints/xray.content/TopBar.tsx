import { Logo } from "@/components/Logo";

// Small pill at the top centre while X-ray is on (UI-SPEC.md, "Top bar").
export function TopBar({ count, onViewAll, onClose }: { count: number; onViewAll: () => void; onClose: () => void }) {
  return (
    <div
      role="status"
      className="pointer-events-auto fixed left-1/2 top-3 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-hi-border bg-hi-bg py-1.5 pl-3 pr-1.5 text-sm text-hi-fg shadow-dialog"
    >
      <Logo size={18} />
      <span className="font-medium">X-ray on</span>
      <span className="text-hi-muted">{count === 0 ? "No hidden instructions found" : `${count} hidden item${count === 1 ? "" : "s"}`}</span>
      {count > 0 && (
        <button type="button" className="hi-btn-text h-8 px-3" onClick={onViewAll}>
          View all
        </button>
      )}
      <button type="button" aria-label="Turn X-ray off" title="Turn X-ray off" className="grid h-8 w-8 place-items-center rounded-full text-hi-muted hover:bg-hi-hover" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
