import { useEffect, useId, useMemo, type ReactNode } from "react";
import { pageIsDark } from "@/lib/theme";
import { Brand } from "./Logo";

// Centred Chrome / Material dialog for the paste guard and upload guard (UI-SPEC.md).
// Light or dark follows the website underneath. Always shows the HiddenInk icon and name.
export function Dialog({ title, children, actions, onClose, wide = false, testMode = false }: { title: string; children: ReactNode; actions: ReactNode; onClose: () => void; wide?: boolean; testMode?: boolean }) {
  const dark = useMemo(() => pageIsDark(), []);
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      className={`hi-root ${dark ? "hi-dark" : ""} fixed inset-0 z-[2147483647] flex items-center justify-center p-4`}
      style={{ background: "var(--hi-scrim)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-hi-bg text-hi-fg ${dark ? "border border-hi-border shadow-dialog" : "shadow-dialog-light"} ${wide ? "max-w-[640px]" : "max-w-[600px]"}`}
      >
        <div className="overflow-y-auto px-6 pt-6">
          <div className="flex items-center justify-between gap-2">
            <Brand />
            {testMode && (
              <span title="Test mode is on in HiddenInk settings: these are sample findings, not real ones." className="rounded-full bg-violet/20 px-2 py-0.5 text-xs font-bold text-violet">
                TEST MODE
              </span>
            )}
          </div>
          <h1 id={titleId} className="mt-3 text-[22px] font-normal leading-7 text-hi-fg [overflow-wrap:anywhere]">
            {title}
          </h1>
          <div className="mt-2 text-sm leading-5 text-hi-muted">{children}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-6 pt-5">{actions}</div>
      </div>
    </div>
  );
}

/** Dialog buttons are 40px tall pills. */
export const dlgBtn = {
  text: "hi-btn-text h-10 px-4",
  filled: "hi-btn-filled h-10 px-6",
};
