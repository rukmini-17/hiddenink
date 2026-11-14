import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { Logo } from "@/components/Logo";
import { sendToTab, type XrayStatus } from "@/lib/messages";
import { testModeItem } from "@/lib/settings";

// Popup: X-ray switch for the current tab, what it found, and a link to settings.

type State = { kind: "loading" } | { kind: "unsupported" } | { kind: "ready"; status: XrayStatus };

async function activeTabId(): Promise<number | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

function statusLine(s: XrayStatus): string {
  if (!s.on) return "Shows text that is hidden on this page";
  if (s.flagged === 0) return "No hidden instructions on this page";
  return `${s.flagged} hidden item${s.flagged === 1 ? "" : "s"} on this page`;
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

  return (
    <main className="w-80 p-4">
      <header className="mb-4 flex items-center gap-3">
        <Logo size={32} />
        <div>
          <h1 className="text-base font-medium text-hi-fg">HiddenInk</h1>
          <p className="text-xs text-hi-muted">Text hidden in pages and PDFs, made visible</p>
        </div>
      </header>

      {state.kind === "unsupported" && <p className="rounded-xl bg-hi-quote px-3 py-3 text-sm text-hi-muted">HiddenInk can’t scan this page. Try a regular website.</p>}
      {state.kind === "loading" && <p className="px-1 text-sm text-hi-muted">Checking this page…</p>}

      {status && (
        <div className="flex items-center gap-3 rounded-xl bg-hi-quote px-3 py-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-hi-fg">X-ray this page</div>
            <div className="text-xs text-hi-muted">{statusLine(status)}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={status.on}
            aria-label={status.on ? "Turn X-ray off" : "Turn X-ray on"}
            onClick={() => ask("xray:toggle")}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${status.on ? "bg-hi-primary" : "bg-hi-faint"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${status.on ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      )}

      <p className="mt-3 px-1 text-xs text-hi-muted">Paste and upload checks are always on for ChatGPT, Claude and Gemini.</p>

      <footer className="mt-3 flex items-center justify-between">
        <button className="hi-btn-text -ml-3" onClick={() => browser.runtime.openOptionsPage()}>
          Settings
        </button>
        {testMode && <span className="rounded-full bg-violet/20 px-2 py-0.5 text-xs font-medium text-violet">Test mode on</span>}
      </footer>
    </main>
  );
}
