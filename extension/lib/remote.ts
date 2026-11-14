import type { ScanResult } from "@hiddenink/core";
import { serverUrlItem } from "./settings";

// Stage 2 hook. The server (classifier, safe-read, Gemini visual diff) plugs in here.
// In Stage 1 every layer is a no-op so the extension works fully offline.

export type Snippet = string;
export type RemoteSource = { url: string } | { pdfBase64: string };

export interface RemoteLayers {
  /** True when a server URL is configured and the client is real (never in Stage 1). */
  readonly enabled: boolean;
  /** POST /score: prompt-injection classifier. */
  score(snippets: Snippet[]): Promise<{ score: number; label: string }[]>;
  /** POST /safe-read: render remotely, return only human-visible text + findings. */
  safeRead(source: RemoteSource): Promise<ScanResult | null>;
  /** POST /visual-diff: Gemini compares the rendered page with the extracted text. */
  visualDiff(source: RemoteSource): Promise<{ hiddenSpans: string[] }>;
}

export const noopRemoteLayers: RemoteLayers = {
  enabled: false,
  async score(snippets) {
    return snippets.map(() => ({ score: 0, label: "unavailable" }));
  },
  async safeRead() {
    return null;
  },
  async visualDiff() {
    return { hiddenSpans: [] };
  },
};

/** Returns the remote layers for the current settings. Stage 1: always the no-op stub. */
export async function getRemoteLayers(): Promise<RemoteLayers> {
  const serverUrl = await serverUrlItem.getValue();
  // Stage 2: `if (serverUrl) return new HttpRemoteLayers(serverUrl)`.
  void serverUrl;
  return noopRemoteLayers;
}
