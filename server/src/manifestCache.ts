/** Per-URL cache of recent safe-fetch manifests, so /api/check-action can compare an
 *  action against what the docs the agent just read actually justified. In-memory: both
 *  endpoints run in the same server process. */
import type { Manifest } from "./manifest.js";

const cache = new Map<string, { manifest: Manifest; at: number }>();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

export function remember(url: string, manifest: Manifest): void {
  cache.set(url, { manifest, at: Date.now() });
}

export function recentManifests(maxAgeMs = DEFAULT_TTL_MS): Manifest[] {
  const now = Date.now();
  return [...cache.values()].filter((e) => now - e.at <= maxAgeMs).map((e) => e.manifest);
}
