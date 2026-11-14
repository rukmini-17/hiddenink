# N0: intercepting and re-sending uploads on chatbot sites

Goal: on chatgpt.com (and Gemini, Claude), pause a PDF upload, scan it, then either let the original
file through or hand the site a different file. Code: `lib/intercept.ts` (pause) and `lib/replay.ts` (re-send).

## How it works

| Step | Mechanism |
|---|---|
| See the upload first | Content script runs at `document_start`; listeners are added on `window` in the **capture phase**, so they fire before any listener the site attaches (React attaches to its root container, which is below `window`). |
| Pause it | `change` on `<input type=file>`: `stopImmediatePropagation()` (change is not cancelable, but nobody else sees it). `drop`: `preventDefault()` + `stopImmediatePropagation()`. `paste` with a PDF file: same as drop. Non-PDF uploads are never touched. |
| Re-send original or replacement | Build a `DataTransfer`, `items.add(file)`. For inputs: set `input.files`, dispatch `input` + `change`. For drops: dispatch synthetic `dragenter`, `dragover`, `drop` `DragEvent`s with that `dataTransfer` on the original target. For pastes: a synthetic `ClipboardEvent("paste")` with the `DataTransfer` as `clipboardData`. |
| Don't intercept our own replay | A module-level `replaying` flag is true while we dispatch (dispatch is synchronous); the interceptors return early when it is set. |
| Fail open | Any error in scanning → the original upload is replayed untouched. HiddenInk must never eat a user's file. |
| Fallback | `UPLOAD_REPLAY_SUPPORTED` in `lib/config.ts`. Set to `false` to show only "Cancel upload" + findings. |

## Expected behaviour per site (to verify by hand, see checklist)

- **ChatGPT**: hidden `<input type=file multiple>` behind the paperclip; React `onChange`. Drag-and-drop onto the composer. Both paths should be intercepted and replayable.
- **Claude**: `<input type=file>` + drop zone, React. Same as ChatGPT.
- **Gemini**: Angular; file input + drop. Angular listens for `change` on the input directly, which our synthetic `change` fires too.
- **Not covered**: sites that use `showOpenFilePicker()` (File System Access API) instead of an `<input type=file>`. That API cannot be intercepted from a content script's isolated world; none of the three sites use it today.

## Manual checklist (fill in the result column)

Turn on **Test mode** in settings so every PDF triggers the modal.

| # | Site | Action | Expected | Result |
|---|---|---|---|---|
| 1 | chatgpt.com | Paperclip → pick a PDF | Modal appears; nothing attached yet | |
| 2 | chatgpt.com | Modal → "Upload anyway" | Original PDF appears as an attachment | |
| 3 | chatgpt.com | Modal → "Upload clean text instead" | `<name>.clean.txt` appears as an attachment | |
| 4 | chatgpt.com | Modal → "Cancel" | Nothing attached | |
| 5 | chatgpt.com | Drag a PDF onto the composer | Modal appears; buttons behave as 2–4 | |
| 6 | chatgpt.com | Pick a PNG | Not intercepted; attaches normally | |
| 7 | claude.ai | Repeat 1–6 | | |
| 8 | gemini.google.com | Repeat 1–6 | | |
| 9 | any | Paste 40+ chars of text | Paste guard; "Paste clean" inserts text into the composer | |

If 2, 3 or 5 fail on a site that matters for the demo: set `UPLOAD_REPLAY_SUPPORTED = false`
(fallback "Cancel + show findings") and write the failure down in `docs/PROGRESS.md`.

## Known risks

- Sites that track drag state (`isDragging`) on `dragenter` may not accept a synthetic `drop` without
  it; we send `dragenter`/`dragover` first for that reason.
- A plain `<textarea>` ignores synthetic paste events (browsers never run default actions for them), so
  the paste guard falls back to inserting text at the caret.
- Some sites clear `input.value` right after handling a change; harmless for us.
