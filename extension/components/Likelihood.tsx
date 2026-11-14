import type { Finding } from "@hiddenink/core";
import { likelihood } from "@/lib/explain";

// High / Medium badge for "Looks like an instruction to an AI". No percentages in the UI.
export function LikelihoodBadge({ finding }: { finding: Finding }) {
  const level = likelihood(finding);
  const cls = level === "High" ? "bg-hi-high-bg text-hi-high-fg" : "bg-hi-med-bg text-hi-med-fg";
  return <span className={`inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium ${cls}`}>{level}</span>;
}

export function LikelihoodLine({ finding }: { finding: Finding }) {
  return (
    <p className="flex items-center gap-2 text-hi-fg">
      Looks like an instruction to an AI <LikelihoodBadge finding={finding} />
    </p>
  );
}
