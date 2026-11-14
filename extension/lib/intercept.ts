import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { isPdf } from "./files";
import { insertTextFallback, isReplaying, replayDrop, replayFileInput, replayPaste } from "./replay";

// N0: capture-phase listeners on `window` see every upload/paste before the page does.
// stopImmediatePropagation() keeps the page (React root listeners included) from ever seeing it.

export type UploadIntercept = {
  kind: "input" | "drop" | "paste";
  files: File[];
  /** Hand the (possibly modified) files back to the page. */
  replay(files: File[]): boolean;
};

export type PasteIntercept = {
  text: string;
  html: string;
  target: Element;
  /** Decide synchronously inside the event handler: call this to stop the original paste. */
  block(): void;
  replayOriginal(): boolean;
  replayText(text: string): boolean;
};

const elementOf = (t: EventTarget | null): Element => (t instanceof Element ? t : document.body);

export function installUploadInterceptor(ctx: ContentScriptContext, onPdfUpload: (i: UploadIntercept) => void) {
  // 1. <input type=file> change (the attach/paperclip button).
  ctx.addEventListener(
    window,
    "change",
    (e) => {
      if (isReplaying()) return;
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.files?.length) return;
      const files = Array.from(input.files);
      if (!files.some(isPdf)) return;
      e.stopImmediatePropagation();
      onPdfUpload({ kind: "input", files, replay: (f) => replayFileInput(input, f) });
    },
    { capture: true },
  );

  // 2. Drag-and-drop.
  ctx.addEventListener(
    window,
    "drop",
    (e) => {
      if (isReplaying()) return;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.some(isPdf)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const target = elementOf(e.target);
      onPdfUpload({ kind: "drop", files, replay: (f) => replayDrop(target, f) });
    },
    { capture: true },
  );
}

export function installPasteInterceptor(
  ctx: ContentScriptContext,
  onPaste: (p: PasteIntercept) => void,
  onPdfUpload: (i: UploadIntercept) => void,
) {
  ctx.addEventListener(
    window,
    "paste",
    (e) => {
      if (isReplaying()) return;
      const cd = e.clipboardData;
      if (!cd) return;
      const target = elementOf(e.target);

      // Pasting a PDF file is an upload too.
      const files = Array.from(cd.files ?? []);
      if (files.some(isPdf)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onPdfUpload({ kind: "paste", files, replay: (f) => replayPaste(target, { files: f }) });
        return;
      }

      // Read everything now: clipboardData is only readable during the event.
      const text = cd.getData("text/plain");
      const html = cd.getData("text/html");
      if (!text && !html) return;
      onPaste({
        text,
        html,
        target,
        block() {
          e.preventDefault();
          e.stopImmediatePropagation();
        },
        replayOriginal: () => replayPaste(target, { text, html }) || insertTextFallback(target, text),
        replayText: (clean) => replayPaste(target, { text: clean }) || insertTextFallback(target, clean),
      });
    },
    { capture: true },
  );
}
