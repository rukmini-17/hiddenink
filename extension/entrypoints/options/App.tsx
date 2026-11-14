import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { getSettings, serverUrlItem, testModeItem } from "@/lib/settings";

// Settings page: server URL (Stage 2 hook) and test mode.
export function App() {
  const [serverUrl, setServerUrl] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getSettings().then((s) => {
      setServerUrl(s.serverUrl);
      setTestMode(s.testMode);
    });
  }, []);

  async function save() {
    await Promise.all([serverUrlItem.setValue(serverUrl.trim()), testModeItem.setValue(testMode)]);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <header className="mb-8 flex items-center gap-3">
        <Logo size={40} />
        <div>
          <div className="text-xs font-medium text-hi-faint">HiddenInk</div>
          <h1 className="text-[22px] leading-7 text-hi-fg">Settings</h1>
        </div>
      </header>

      <section className="mb-6">
        <label className="block text-sm font-medium text-hi-fg" htmlFor="serverUrl">
          Server URL
        </label>
        <p className="mb-2 text-xs text-hi-muted">Leave empty to run fully on your device. A server adds deeper scans (coming in Stage 2).</p>
        <input
          id="serverUrl"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://…"
          className="h-10 w-full rounded-lg border border-hi-border bg-hi-bg px-3 text-sm text-hi-fg outline-none focus:border-hi-primary"
        />
      </section>

      <section className="mb-8">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="mt-1 accent-[var(--hi-primary)]" />
          <span>
            <span className="font-medium text-hi-fg">Test mode</span>
            <br />
            <span className="text-xs text-hi-muted">Shows sample findings for every PDF upload, long paste and X-ray scan, so the flow can be tried before the detection engine finds anything. Turn off for real use.</span>
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button className="hi-btn-filled h-10 px-6" onClick={save}>
          Save
        </button>
        {saved && <span className="text-sm text-hi-muted">Saved</span>}
      </div>
      <p className="mt-10 text-xs text-hi-faint">HiddenInk never stores or sends what you paste or upload. Everything is scanned on your device.</p>
    </main>
  );
}
