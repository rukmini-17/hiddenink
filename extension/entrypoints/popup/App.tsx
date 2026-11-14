import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { Inky } from "@/components/Inky";
import { btn } from "@/components/Modal";
import { countLabel } from "@/lib/explain";
import { sendToTab, type XrayStatus } from "@/lib/messages";
import { testModeItem } from "@/lib/settings";

// Popup: X-ray toggle, finding count for the current tab, link to settings, and Inky.

type State = { kind: "loading" } | { kind: "unsupported" } | { kind: "ready"; status: XrayStatus };

async function activeTabId(): Promise<number | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    void testModeItem.getValue().then(setTestMode);
    void ask("xray:status");
  }, []);

  async function ask(type: "xray:status" | "xray:toggle") {
    const id = await activeTabId();
    if (id == null) return setState({ kind: "unsupported" });
    try {
      setState({ kind: "ready", status: await sendToTab<XrayStatus>(id, { type }) });
    } catch {
      // No content script here (chrome:// pages, the Web Store, PDFs opened directly).
      setState({ kind: "unsupported" });
    }
  }

  const status = state.kind === "ready" ? state.status : null;
  const mood = status?.on ? (status.flagged > 0 ? "alert" : "happy") : "calm";

  return (
    <main className="hi-root w-72 p-4">
      <header className="mb-3 flex items-center gap-3">
        <Inky size={48} mood={mood} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber">HiddenInk</div>
          <h1 className="text-sm font-semibold">What your AI reads, made visible</h1>
        </div>
      </header>

      {state.kind === "unsupported" && <p className="text-sm text-ink-soft">HiddenInk can’t scan this page. Try a regular website.</p>}
      {state.kind === "loading" && <p className="text-sm text-ink-soft">Checking this page…</p>}

      {status && (
        <>
          <p className="mb-3 text-sm">
            {status.on ? (
              status.flagged > 0 ? (
                <>
                  <span className="font-semibold">{countLabel(status.flagged)}</span> on this page.
                </>
              ) : (
                <>Nothing hidden from you here. {status.total > 0 && <span className="text-ink-faint">({status.total} hidden but harmless)</span>}</>
              )
            ) : (
              "X-ray is off. Turn it on to see text hidden from you."
            )}
          </p>
          <button className={`${btn.primary} w-full`} onClick={() => ask("xray:toggle")}>
            {status.on ? "Turn X-ray off" : "Turn X-ray on"}
          </button>
        </>
      )}

      <footer className="mt-4 flex items-center justify-between text-xs text-ink-faint">
        <button className="underline hover:text-ink" onClick={() => browser.runtime.openOptionsPage()}>
          Settings
        </button>
        {testMode && <span className="rounded-full bg-amber-soft px-2 py-0.5 font-semibold text-ink">test mode</span>}
      </footer>
    </main>
  );
}
