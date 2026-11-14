import { LENGTH_SIGNAL, SIGNALS } from "./config";

export type AiScore = { score: number; reasons: string[] };

/** Heuristic 0–1 score for "this text is an instruction aimed at an AI". See config.ts. */
export function scoreAiAimed(text: string): AiScore {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return { score: 0, reasons: [] };

  let notFired = 1; // Π(1 − weight) over fired signals
  const reasons: string[] = [];
  for (const signal of SIGNALS) {
    if (signal.pattern.test(normalized)) {
      notFired *= 1 - signal.weight;
      reasons.push(signal.reason);
    }
  }
  // Length only matters on top of another signal; long benign text alone shouldn't score.
  if (reasons.length > 0 && normalized.length >= LENGTH_SIGNAL.minChars) {
    notFired *= 1 - LENGTH_SIGNAL.weight;
    reasons.push(LENGTH_SIGNAL.reason);
  }
  return { score: round2(1 - notFired), reasons };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
