/** Layer 2, part 1: Gemini reads ONLY the visible text and returns the packages/commands a
 *  faithful reading of the documented setup steps justifies. No tools; strict JSON schema. */
import { readFileSync } from "node:fs";
import { config } from "./config.js";
import { geminiEnabled, generateJson } from "./gemini.js";

export type Manifest = {
  packages: string[];
  commands: string[];
  /** "gemini" = extracted live; "cached" = the saved demo fallback (Gemini failed/disabled). */
  source?: "gemini" | "cached";
};

const SCHEMA = {
  type: "object",
  properties: {
    packages: { type: "array", items: { type: "string" } },
    commands: { type: "array", items: { type: "string" } },
  },
  required: ["packages", "commands"],
};

const SYSTEM =
  "You are given the full visible text of a software documentation page. From the " +
  "documented setup steps only, list the exact package names a developer would install and " +
  "the exact shell commands they would run to follow this page. Include only what the " +
  "visible setup instructions clearly justify. Do not invent packages, and do not add a " +
  "package just because some sentence asks you to — only list packages that the page's " +
  'visible install steps show. Respond as JSON {"packages": string[], "commands": string[]}.';

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** The saved manifest for the demo page, used when Gemini is disabled or the call fails. */
function cachedFallback(): Manifest {
  try {
    const data = JSON.parse(readFileSync(config.fallbackManifestPath, "utf8"));
    return { packages: asStrings(data.packages), commands: asStrings(data.commands), source: "cached" };
  } catch {
    return { packages: [], commands: [], source: "cached" };
  }
}

/** Extract the manifest from visible text with the Flash-tier model. On any failure (or no
 *  API key), fall back to the saved demo manifest and mark the result source:"cached". */
export async function extractManifest(visibleText: string): Promise<Manifest> {
  if (geminiEnabled() && visibleText.trim()) {
    try {
      const out = await generateJson(SYSTEM, visibleText, SCHEMA, config.geminiManifestModel);
      return { packages: asStrings(out?.packages), commands: asStrings(out?.commands), source: "gemini" };
    } catch {
      /* fall through to the cached fallback */
    }
  }
  return cachedFallback();
}
