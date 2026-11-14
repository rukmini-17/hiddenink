import { useEffect, type ReactNode } from "react";
import { Inky, type InkyMood } from "./Inky";

// Calm, warm modal used by the paste guard and upload guard. Rendered inside our Shadow DOM.
export function Modal({ title, mood = "alert", children, footer, onClose, wide = false, testMode = false }: { title: string; mood?: InkyMood; children: ReactNode; footer: ReactNode; onClose: () => void; wide?: boolean; testMode?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="hi-root fixed inset-0 z-[2147483647] flex items-center justify-center bg-ink/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-paper shadow-card ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <header className="flex items-center gap-3 border-b border-paper-deep px-5 py-4">
          <Inky size={44} mood={mood} />
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber">HiddenInk</div>
            <h1 className="text-base font-semibold text-ink">{title}</h1>
          </div>
          {testMode && (
            <span title="Test mode is on in HiddenInk settings: these are sample findings, not real ones." className="rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-ink">
              TEST MODE
            </span>
          )}
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-paper-deep bg-paper-deep/60 px-5 py-3">{footer}</footer>
      </div>
    </div>
  );
}

export const btn = {
  primary: "rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:bg-ink-soft",
  secondary: "rounded-lg border border-ink/20 bg-paper px-3.5 py-2 text-sm font-semibold text-ink hover:bg-paper-deep",
  quiet: "rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-paper-deep",
};
