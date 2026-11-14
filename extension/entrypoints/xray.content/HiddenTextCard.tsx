import type { Finding } from "@hiddenink/core";
import { forwardRef, useState } from "react";
import { LikelihoodLine } from "@/components/Likelihood";
import { Brand } from "@/components/Logo";
import { causeLine, whatItSays } from "@/lib/explain";

// The card that opens when a revealed line is clicked (UI-SPEC.md, "Click card").

export const HiddenTextCard = forwardRef<HTMLDivElement, { finding: Finding; onPage: boolean; total: number; onViewAll: () => void; style?: React.CSSProperties; className?: string }>(
  function HiddenTextCard({ finding, onPage, total, onViewAll, style, className = "" }, ref) {
    const [copied, setCopied] = useState(false);
    const text = whatItSays(finding, 2000);

    async function copy() {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Clipboard can be blocked by the page's permissions policy; nothing else to do.
      }
    }

    return (
      <div
        ref={ref}
        role="dialog"
        aria-label="Hidden text"
        style={style}
        className={`pointer-events-auto w-[380px] max-w-[calc(100vw-32px)] rounded-2xl border border-hi-border bg-hi-bg p-5 text-sm text-hi-fg shadow-dialog ${className}`}
      >
        <Brand />
        <h2 className="mt-3 text-xl font-normal leading-[26px] text-hi-fg">There is hidden text here</h2>
        <p className="mt-1 text-hi-muted">
          {onPage
            ? "This text can’t be seen on the page, but an AI assistant reading it would see it."
            : "This text isn’t shown anywhere on the page, but an AI assistant reading it would see it."}
        </p>
        <blockquote className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-hi-quote px-3 py-2.5 text-[13px] leading-[18px] text-hi-fg [overflow-wrap:anywhere]">{text}</blockquote>
        <p className="mt-3 text-hi-fg">{causeLine(finding)}</p>
        <div className="mt-1">
          <LikelihoodLine finding={finding} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="hi-btn-text" onClick={copy}>
            {copied ? "Copied" : "Copy text"}
          </button>
          <button type="button" className="hi-btn-filled" onClick={onViewAll}>
            View all {total}
          </button>
        </div>
      </div>
    );
  },
);
