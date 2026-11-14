import type { ScanResult } from "@hiddenink/core";
import { useState } from "react";
import { FindingCard } from "@/components/FindingCard";
import { Modal, btn } from "@/components/Modal";
import { countLabel, flaggedOf } from "@/lib/explain";

export function PasteGuardModal({ result, onPasteClean, onPasteAnyway, onCancel, testMode = false }: { result: ScanResult; onPasteClean: () => void; onPasteAnyway: () => void; onCancel: () => void; testMode?: boolean }) {
  const [showMe, setShowMe] = useState(false);
  const flagged = flaggedOf(result.findings);
  return (
    <Modal title="This paste contains hidden instructions" onClose={onCancel} testMode={testMode} footer={
      <>
        <button className={btn.quiet} onClick={() => setShowMe((v) => !v)}>{showMe ? "Hide details" : "Show me"}</button>
        <button className={btn.quiet} onClick={onCancel}>Cancel</button>
        <button className={btn.secondary} onClick={onPasteAnyway}>Paste anyway</button>
        <button className={btn.primary} onClick={onPasteClean}>Paste clean</button>
      </>
    }>
      <p className="text-sm">
        What you see isn’t everything the AI would read. {countLabel(flagged.length)} {flagged.length === 1 ? "is" : "are"} hidden in this text.
        <span className="text-ink-soft"> “Paste clean” keeps only the text you can actually see.</span>
      </p>
      {showMe && (
        <div className="mt-3 space-y-2">
          {flagged.map((f) => <FindingCard key={f.id} finding={f} />)}
        </div>
      )}
    </Modal>
  );
}
