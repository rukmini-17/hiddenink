import { useEffect, useState } from "react";
import { Inky } from "@/components/Inky";
import { btn } from "@/components/Modal";
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
    <main className="hi-root mx-auto max-w-lg p-8">
      <header className="mb-6 flex items-center gap-3">
        <Inky size={56} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber">HiddenInk</div>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <section className="mb-6">
        <label className="block text-sm font-semibold" htmlFor="serverUrl">
          Server URL
        </label>
        <p className="mb-2 text-xs text-ink-soft">Leave empty to run fully on your device. A server adds deeper scans (coming in Stage 2).</p>
        <input id="serverUrl" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm" />
      </section>

      <section className="mb-6">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="mt-1" />
          <span>
            <span className="font-semibold">Test mode</span>
            <br />
            <span className="text-xs text-ink-soft">Shows sample findings for every PDF upload, long paste and X-ray scan, so the flow can be tried before the detection engine finds anything. Turn off for real use.</span>
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button className={btn.primary} onClick={save}>
          Save
        </button>
        {saved && <span className="text-sm text-teal">Saved</span>}
      </div>
      <p className="mt-8 text-xs text-ink-faint">HiddenInk never stores or sends what you paste or upload. Everything is scanned on your device.</p>
    </main>
  );
}
