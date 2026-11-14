import type { ScanResult } from "@hiddenink/core";
import { useState } from "react";
import { Dialog, dlgBtn } from "@/components/Dialog";
import { LikelihoodLine } from "@/components/Likelihood";
import { PdfPreview } from "@/components/PdfPreview";
import { UPLOAD_REPLAY_SUPPORTED } from "@/lib/config";
import { causeLine, flaggedOf, techniqueLabel, whatItSays } from "@/lib/explain";
import type { PagePreview } from "@/lib/messages";

export function UploadGuardModal({ fileName, result, previews, onUploadAnyway, onUploadClean, onCancel, otherFlagged = 0, testMode = false }: {
  fileName: string;
  result: ScanResult;
  previews: PagePreview[];
  onUploadAnyway: () => void;
  onUploadClean: () => void;
  onCancel: () => void;
  /** Other PDFs in the same upload that were flagged too (only the first is previewed). */
  otherFlagged?: number;
  testMode?: boolean;
}) {
  const flagged = flaggedOf(result.findings);
  const n = flagged.length;
  const [active, setActive] = useState<string | undefined>(flagged[0]?.id);
  const canClean = result.visibleText.trim().length > 0;

  return (
    <Dialog
      wide
      title={`Hidden text found in ${fileName}`}
      onClose={onCancel}
      testMode={testMode}
      actions={
        UPLOAD_REPLAY_SUPPORTED ? (
          <>
            <button className={dlgBtn.text} onClick={onUploadAnyway}>
              Upload anyway
            </button>
            <button className={dlgBtn.text} onClick={onCancel}>
              Cancel
            </button>
            <button className={dlgBtn.filled} onClick={onUploadClean} disabled={!canClean} title={canClean ? "" : "No visible text could be extracted"} autoFocus>
              Upload clean text instead
            </button>
          </>
        ) : (
          // N0 fallback: re-sending files to this site is unreliable, so we only cancel and explain.
          <button className={dlgBtn.filled} onClick={onCancel} autoFocus>
            Cancel upload
          </button>
        )
      }
    >
      <p className="text-hi-fg">
        This PDF has text you can’t see, but an AI would read it. Nothing has been uploaded yet.
        {otherFlagged > 0 && (
          <span className="text-hi-muted">
            {" "}
            {otherFlagged} more PDF{otherFlagged === 1 ? "" : "s"} in this upload {otherFlagged === 1 ? "has" : "have"} hidden text too. Upload clean text instead cleans all of them.
          </span>
        )}
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-[176px_1fr]">
        <div className="space-y-3">
          {previews.length === 0 && <p className="text-xs text-hi-muted">No preview available.</p>}
          {previews.map((p) => (
            <PdfPreview key={p.page} preview={p} findings={flagged} activeId={active} onSelect={setActive} />
          ))}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-hi-muted">
            {n} hidden item{n === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-3">
            {flagged.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => setActive(f.id)} className={`block w-full rounded-xl px-3 py-2.5 text-left ${active === f.id ? "bg-hi-quote" : "hover:bg-hi-hover"}`}>
                  <span className="block text-xs text-hi-muted">
                    {techniqueLabel(f)}
                    {f.location.page != null ? ` · page ${f.location.page}` : ""}
                  </span>
                  <span className="mt-1 block text-[13px] leading-[18px] text-hi-fg [overflow-wrap:anywhere]">{whatItSays(f, 400)}</span>
                  <span className="mt-1 block text-xs text-hi-muted">{causeLine(f)}</span>
                </button>
                <div className="mt-1 px-3">
                  <LikelihoodLine finding={f} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 px-3">The highlighted {n === 1 ? "line" : "lines"} on the page {n === 1 ? "is" : "are"} invisible when you read the PDF.</p>
        </div>
      </div>
    </Dialog>
  );
}
