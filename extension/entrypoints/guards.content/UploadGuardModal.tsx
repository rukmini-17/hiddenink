import type { ScanResult } from "@hiddenink/core";
import { useState } from "react";
import { FindingCard } from "@/components/FindingCard";
import { Modal, btn } from "@/components/Modal";
import { PdfPreview } from "@/components/PdfPreview";
import { UPLOAD_REPLAY_SUPPORTED } from "@/lib/config";
import { countLabel, flaggedOf } from "@/lib/explain";
import type { PagePreview } from "@/lib/messages";

export function UploadGuardModal({ fileName, result, previews, onUploadAnyway, onUploadClean, onCancel }: {
  fileName: string;
  result: ScanResult;
  previews: PagePreview[];
  onUploadAnyway: () => void;
  onUploadClean: () => void;
  onCancel: () => void;
}) {
  const flagged = flaggedOf(result.findings);
  const [active, setActive] = useState<string | undefined>(flagged[0]?.id);
  const canClean = result.visibleText.trim().length > 0;

  return (
    <Modal wide title={`“${fileName}” contains hidden instructions`} onClose={onCancel} footer={
      UPLOAD_REPLAY_SUPPORTED ? (
        <>
          <button className={btn.quiet} onClick={onCancel}>Cancel</button>
          <button className={btn.secondary} onClick={onUploadAnyway}>Upload anyway</button>
          <button className={btn.primary} onClick={onUploadClean} disabled={!canClean} title={canClean ? "" : "No visible text could be extracted"}>Upload clean text instead</button>
        </>
      ) : (
        // N0 fallback: re-sending files to this site is unreliable, so we only cancel and explain.
        <button className={btn.primary} onClick={onCancel}>Cancel upload</button>
      )
    }>
      <p className="mb-3 text-sm">
        This PDF has {countLabel(flagged.length)} you can’t see but the AI would read. The glowing boxes show where.
      </p>
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          {previews.length === 0 && <p className="text-sm text-ink-soft">No preview available.</p>}
          {previews.map((p) => <PdfPreview key={p.page} preview={p} findings={flagged} activeId={active} onSelect={setActive} />)}
        </div>
        <div className="space-y-2">
          {flagged.map((f) => <FindingCard key={f.id} finding={f} active={active === f.id} onClick={() => setActive(f.id)} />)}
        </div>
      </div>
    </Modal>
  );
}
