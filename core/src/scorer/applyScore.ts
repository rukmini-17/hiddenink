import type { Finding } from "../types";
import { scoreAiAimed } from "./score";

/**
 * Fill in aiScore and finish `flagged` for a finding.
 * Scores the decoded text when there is one (that's what the AI actually reads).
 * `flagged` stays true if the detector already marked the technique as suspicious on its own.
 */
export function applyScore(finding: Finding, threshold: number): Finding {
  const { score, reasons } = scoreAiAimed(finding.decoded ?? finding.text);
  return {
    ...finding,
    aiScore: score,
    flagged: finding.flagged || score >= threshold,
    reasons: [...finding.reasons, ...reasons],
  };
}
