/** Server configuration, loaded from the repo-root .env. */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

// Load the repo-root .env (keys already in the environment win).
dotenv.config({ path: resolve(repoRoot, ".env") });

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** Required Bearer token for /api/*. One name everywhere: HIDDENINK_TOKEN
   *  (HIDDENINK_API_KEY still accepted for back-compat). Empty = dev, no auth, with a warning. */
  apiKey: process.env.HIDDENINK_TOKEN ?? process.env.HIDDENINK_API_KEY ?? "",
  /** Built core IIFE that exposes window.HiddenInk. Build with `pnpm build:core`. */
  coreIifePath: resolve(repoRoot, "core", "dist", "hiddenink-core.iife.js"),
  /** Playwright channel; "chrome" uses the installed Google Chrome (no download). */
  browserChannel: process.env.PW_BUNDLED_CHROMIUM ? undefined : "chrome",
  /** Extra settle time (ms) after load for late/JS-rendered content. */
  settleMs: Number(process.env.SAFE_FETCH_SETTLE_MS ?? 800),
  /** Gemini (Layer 2 manifest + incident report). Empty key = cached fallback manifest. */
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  /** Model for the incident report (optional). */
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-4-hydrogen",
  /** Flash-tier model for the structured-JSON manifest call (higher free limits). */
  geminiManifestModel: process.env.GEMINI_MANIFEST_MODEL ?? "gemini-3.5-flash-lite",
  /** Saved manifest used for the demo page when the Gemini call fails or is disabled. */
  fallbackManifestPath: resolve(here, "..", "fallback-manifest.json"),
};
