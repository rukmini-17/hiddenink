import type { Finding } from "@hiddenink/core";
import { TECHNIQUE_INFO, headline, whatItSays, whyAi } from "@/lib/explain";

// The hover/click card: what the hidden text says, which trick hides it, and why it looks AI-aimed.
export function FindingCard({ finding, compact = false, active = false, onClick }: { finding: Finding; compact?: boolean; active?: boolean; onClick?: () => void }) {
  const info = TECHNIQUE_INFO[finding.technique];
  const why = whyAi(finding);
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-paper p-3 text-left shadow-card transition ${active ? "border-amber ring-2 ring-amber-soft" : "border-paper-deep"} ${onClick ? "cursor-pointer hover:border-amber" : ""}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-semibold text-ink">{info.label}</span>
        {finding.location.page != null && <span className="text-xs text-ink-faint">page {finding.location.page}</span>}
        {finding.decoded && <span className="text-xs text-ink-faint">decoded</span>}
        {finding.aiScore > 0 && <span className="ml-auto text-xs text-ink-faint">{Math.round(finding.aiScore * 100)}% AI-aimed</span>}
      </div>
      {!compact && <p className="mb-1 text-xs text-ink-soft">{headline(finding)}</p>}
      <blockquote className="my-1 border-l-2 border-amber pl-2 font-mono text-[13px] leading-snug text-ink">“{whatItSays(finding)}”</blockquote>
      {!compact && (
        <>
          <p className="mt-2 text-xs text-ink-soft">
            <span className="font-semibold">How it hides:</span> {info.how}
          </p>
          {why.length > 0 && (
            <div className="mt-1 text-xs text-ink-soft">
              <span className="font-semibold">Why it looks aimed at an AI:</span>
              <ul className="ml-4 list-disc">
                {why.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
