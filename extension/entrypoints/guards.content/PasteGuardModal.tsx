import type { ScanResult } from "@hiddenink/core";
import { useState } from "react";
import { Dialog, dlgBtn } from "@/components/Dialog";
import { LikelihoodBadge } from "@/components/Likelihood";
import { causeLine, flaggedOf, techniqueLabel, whatItSays } from "@/lib/explain";

export function PasteGuardModal({ result, onPasteClean, onPasteAnyway, onCancel, testMode = false }: { result: ScanResult; onPasteClean: () => void; onPasteAnyway: () => void; onCancel: () => void; testMode?: boolean }) {
  const [showMe, setShowMe] = useState(false);
  const flagged = flaggedOf(result.findings);
  const n = flagged.length;
  return (
    <Dialog
      title="Hidden instructions in what you’re pasting"
      onClose={onCancel}
      testMode={testMode}
      actions={
        <>
          <button className={dlgBtn.text} onClick={() => setShowMe((v) => !v)}>
            {showMe ? "Show less" : "Show me"}
          </button>
          <button className={dlgBtn.text} onClick={onCancel}>
            Cancel
          </button>
          <button className={dlgBtn.text} onClick={onPasteAnyway}>
            Paste anyway
          </button>
          <button className={dlgBtn.filled} onClick={onPasteClean} autoFocus>
            Paste clean
          </button>
        </>
      }
    >
      <p className="text-hi-fg">
        The text you copied has {n} item{n === 1 ? "" : "s"} that {n === 1 ? "is" : "are"} invisible on the page but readable by an AI. Nothing has been pasted yet.
      </p>
      <ul className="mt-4 space-y-2">
        {flagged.map((f) => (
          <li key={f.id} className="rounded-xl bg-hi-quote px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs font-medium text-hi-muted">
                {techniqueLabel(f)}
                {f.decoded ? " · decoded" : ""}
              </span>
              <LikelihoodBadge finding={f} />
            </div>
            <p className="mt-1 text-[13px] leading-[18px] text-hi-fg [overflow-wrap:anywhere]">{whatItSays(f, showMe ? 2000 : 160)}</p>
            {showMe && <p className="mt-1 text-xs text-hi-muted">{causeLine(f)}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-4">Paste clean removes these and keeps everything you can see on the page.</p>
    </Dialog>
  );
}
