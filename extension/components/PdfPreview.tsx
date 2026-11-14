import type { Finding } from "@hiddenink/core";
import type { PagePreview } from "@/lib/messages";

/**
 * Finding bbox → CSS percentages over the rendered page image.
 * Assumes PDF bbox = [x, y, width, height] in pdf.js viewport units at scale 1, origin top-left.
 * (Web bboxes are [x, y, w, h] in document CSS px; PDF units are set by R4 in docs/CONTRACTS.md.)
 * If R4 lands with a different convention, change only this function.
 */
function bboxToPercent(bbox: [number, number, number, number], preview: PagePreview) {
  const [x, y, w, h] = bbox;
  const s = preview.scale;
  const pad = 3; // px of breathing room so 1pt-high text still gets a visible box
  return {
    left: `${((x * s - pad) / preview.width) * 100}%`,
    top: `${((y * s - pad) / preview.height) * 100}%`,
    width: `${((w * s + 2 * pad) / preview.width) * 100}%`,
    height: `${((h * s + 2 * pad) / preview.height) * 100}%`,
  };
}

export function PdfPreview({ preview, findings, activeId, onSelect }: { preview: PagePreview; findings: Finding[]; activeId?: string; onSelect: (id: string) => void }) {
  const onPage = findings.filter((f) => f.location.page === preview.page && f.location.bbox);
  return (
    <figure className="relative inline-block w-full overflow-hidden rounded-lg border border-paper-deep bg-white shadow-sm">
      <img src={preview.dataUrl} alt={`Page ${preview.page} preview`} className="block w-full" draggable={false} />
      {onPage.map((f) => (
        <button
          key={f.id}
          type="button"
          title="Hidden text"
          onClick={() => onSelect(f.id)}
          style={bboxToPercent(f.location.bbox!, preview)}
          className={`hi-glow absolute min-h-[10px] rounded-sm bg-amber/25 ${activeId === f.id ? "ring-2 ring-ink" : ""}`}
        />
      ))}
      <figcaption className="absolute bottom-1 right-2 rounded bg-ink/70 px-1.5 text-[11px] text-paper">page {preview.page}</figcaption>
    </figure>
  );
}
