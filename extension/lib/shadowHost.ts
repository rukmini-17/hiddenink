import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi, type ShadowRootContentScriptUi } from "wxt/utils/content-script-ui/shadow-root";

/**
 * One Shadow DOM host per content script, with a React root inside. WXT injects our Tailwind CSS
 * into the shadow root (cssInjectionMode: "ui"), so nothing leaks into or out of the page.
 */
export class ShadowHost {
  private ui: ShadowRootContentScriptUi<Root> | null = null;

  constructor(
    private ctx: ContentScriptContext,
    private name: string,
  ) {}

  async render(node: ReactNode): Promise<void> {
    if (!this.ui) {
      await waitForBody();
      this.ui = await createShadowRootUi<Root>(this.ctx, {
        name: this.name,
        position: "inline",
        anchor: "body",
        onMount(container, _shadow, host) {
          // Pinned to the page origin with no size: our fixed children draw on top of everything, and
          // absolute children (the X-ray reveal layer) don't move when the page grows above the host.
          host.style.position = "absolute";
          host.style.left = "0";
          host.style.top = "0";
          host.style.width = "0";
          host.style.height = "0";
          host.style.zIndex = "2147483647";
          const el = document.createElement("div");
          container.append(el);
          return createRoot(el);
        },
        onRemove(root) {
          root?.unmount();
        },
      });
      this.ui.mount();
    }
    this.ui.mounted?.render(node);
  }

  clear(): void {
    this.ui?.mounted?.render(null);
  }

  /** True for nodes that belong to our own UI (so scanners can skip them). */
  owns(node: Node): boolean {
    return !!this.ui?.shadowHost.contains(node);
  }
}

function waitForBody(): Promise<void> {
  if (document.body) return Promise.resolve();
  return new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (document.body) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(document.documentElement, { childList: true });
  });
}
