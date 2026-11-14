import { storage } from "wxt/utils/storage";

// User settings, synced across the user's Chrome profiles.
export type Settings = {
  /** Base URL of the HiddenInk server. Empty = local-only mode (Stage 1). */
  serverUrl: string;
  /** Fake findings when the engine returns none, so the UI can be tested before `core` is finished. */
  testMode: boolean;
};

export const serverUrlItem = storage.defineItem<string>("sync:serverUrl", { fallback: "" });
export const testModeItem = storage.defineItem<boolean>("sync:testMode", { fallback: false });

export async function getSettings(): Promise<Settings> {
  const [serverUrl, testMode] = await Promise.all([serverUrlItem.getValue(), testModeItem.getValue()]);
  return { serverUrl, testMode };
}

/**
 * Event handlers (paste!) must decide synchronously, so content scripts keep an in-memory copy
 * of the settings that follows storage changes.
 */
export function createSettingsCache(): { current: Settings; ready: Promise<void> } {
  const cache = { current: { serverUrl: "", testMode: false } as Settings, ready: Promise.resolve() };
  cache.ready = getSettings().then((s) => {
    cache.current = s;
  });
  serverUrlItem.watch((v) => (cache.current = { ...cache.current, serverUrl: v ?? "" }));
  testModeItem.watch((v) => (cache.current = { ...cache.current, testMode: v ?? false }));
  return cache;
}
