// N0: re-sending an upload or a paste to the page after we paused it.
//
// All replays are synthetic DOM events dispatched from the content script. Our own capture-phase
// interceptors (intercept.ts) skip anything dispatched while `replaying` is true, so a replay
// is never intercepted twice. dispatchEvent is synchronous, so the flag is safe.

let replaying = false;
export const isReplaying = () => replaying;

function withReplay<T>(fn: () => T): T {
  replaying = true;
  try {
    return fn();
  } finally {
    replaying = false;
  }
}

export function filesToDataTransfer(files: File[]): DataTransfer {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  return dt;
}

/** Put `files` into a file input and fire the events frameworks listen for (React: change/input). */
export function replayFileInput(input: HTMLInputElement, files: File[]): boolean {
  try {
    input.files = filesToDataTransfer(files).files;
  } catch (err) {
    console.warn("[HiddenInk] could not set input.files", err);
    return false;
  }
  return withReplay(() => {
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    return true;
  });
}

/** Re-create a drag-and-drop of `files` onto `target`. Sends dragenter/dragover first for sites that track drag state. */
export function replayDrop(target: Element, files: File[]): boolean {
  const dt = filesToDataTransfer(files);
  return withReplay(() => {
    for (const type of ["dragenter", "dragover", "drop"] as const) {
      target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, composed: true, dataTransfer: dt }));
    }
    return true;
  });
}

export type PastePayload = { text?: string; html?: string; files?: File[] };

/**
 * Re-create a paste. Returns true if the page's editor handled it (called preventDefault).
 * Browsers never run the default action for synthetic events, so a plain <textarea> ignores this;
 * callers then fall back to insertTextFallback().
 */
export function replayPaste(target: Element, payload: PastePayload): boolean {
  const dt = new DataTransfer();
  if (payload.text) dt.setData("text/plain", payload.text);
  if (payload.html) dt.setData("text/html", payload.html);
  for (const f of payload.files ?? []) dt.items.add(f);
  const ev = new ClipboardEvent("paste", { bubbles: true, cancelable: true, composed: true, clipboardData: dt });
  return withReplay(() => !target.dispatchEvent(ev));
}

/** Insert plain text at the caret of the focused input/contenteditable. */
export function insertTextFallback(target: Element | null, text: string): boolean {
  const el = (target as HTMLElement | null) ?? (document.activeElement as HTMLElement | null);
  if (!el) return false;
  el.focus();
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  try {
    return document.execCommand("insertText", false, text);
  } catch {
    return false;
  }
}
