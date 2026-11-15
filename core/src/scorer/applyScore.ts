import type { Finding } from "../types";
import { CODE_INJECTION_REASON, looksLikeCodeInjection } from "./codeInjection";
import { scoreAiAimed } from "./score";

/**
 * Fill in aiScore and finish `flagged` for a finding.
 * Scores the decoded text when there is one (that's what the AI actually reads).
 * `flagged` stays true if the detector already marked the technique as suspicious on its own,
 * and is also forced true for hidden text that carries an install command or import.
 */
export function applyScore(finding: Finding, threshold: number): Finding {
  const text = finding.decoded ?? finding.text;
  const { score, reasons } = scoreAiAimed(text);
  const codeInjection = looksLikeCodeInjection(text);
  const merged = [...finding.reasons, ...reasons];
  if (codeInjection && !merged.includes(CODE_INJECTION_REASON)) merged.push(CODE_INJECTION_REASON);
  return {
    ...finding,
    aiScore: score,
    flagged: finding.flagged || score >= threshold || codeInjection,
    reasons: merged,
  };
}
