# HiddenInk extension: run and demo checklist

How to build, load and walk through the Stage 1 demo. Nothing here needs Node on your Mac; all builds run in Docker.

## 1. Build (only after code changes)

Docker Desktop must be running. From the repo root (`hiddenink/`):

```bash
extension/scripts/node-docker.sh pnpm install                          # after dependency changes
extension/scripts/node-docker.sh pnpm build:core                       # engine first
extension/scripts/node-docker.sh pnpm --filter @hiddenink/extension build
extension/scripts/smoke/run.sh                                         # optional: 34 headless checks
```

Output: `extension/.output/chrome-mv3/`. The folder starts with a dot, so it's hidden in Finder and in file
pickers: press **Cmd + Shift + .** to show hidden files, or **Cmd + Shift + G** and paste the full path.

## 2. Load the extension in Chrome

1. `chrome://extensions` → turn on **Developer mode** (top right).
2. **Load unpacked** → select `extension/.output/chrome-mv3/`.
3. Pin HiddenInk (puzzle-piece menu) so Inky sits in the toolbar.
4. On the HiddenInk card → **Details** → turn on **Allow access to file URLs** (needed for the local demo HTML).
5. After every rebuild: press the reload icon on the HiddenInk card, then refresh the tab you are testing in.

### Test mode must be OFF

"Test mode" is a setting of our own: when on, every PDF upload, long paste and X-ray scan shows *fake* sample
findings. It existed so the UI could be tried before the engine was ready. With the real engine it must be off,
or clean files will show warnings.

Check: click Inky → if a small "test mode" chip shows at the bottom of the popup, it's on. Click **Settings**
(link in the popup), untick **Test mode**, **Save**.

## 3. X-ray on the poisoned job listing

1. Drag `corpus/demo/job_listing_poisoned.html` into a Chrome tab.
2. Click Inky → **Turn X-ray on**.
3. Expect: the page dims, glowing boxes sit over the hidden text, the side panel lists 6 findings with technique,
   score and (for Unicode) the decoded text, the toolbar icon shows a "6" badge. Hover a glow for the card; click a
   card in the panel to scroll to it. Scroll the page: boxes must stay glued to their text.
4. Turn X-ray off.
5. Control: open any normal site, turn X-ray on, expect "Nothing hidden from you here".

## 4. Paste guard (chatgpt.com, claude.ai, gemini.google.com)

The guard only reacts to pastes that carry hidden text. Normal pastes go through untouched.

1. On the job-listing tab (X-ray **off**), click into the page, **Cmd + A**, **Cmd + C**.
2. Go to chatgpt.com, click the composer, **Cmd + V**.
   Expect the modal "This paste contains hidden instructions". Click **Show me** to see the hidden snippets.
3. Click **Paste clean**. Expect only the visible text of the listing to appear in the composer.
4. Repeat 1–2 and click **Paste anyway**. Expect the full original paste.
5. Control: type a sentence in Notes, copy it, paste into the composer. Expect **no modal**, the text just appears.

## 5. Upload guard (same three sites)

1. On chatgpt.com, click the paperclip (attach) → pick `corpus/demo/resume_poisoned.pdf`.
   Expect the modal with the page preview, a glowing box on the hidden line, a card, and three buttons.
2. **Upload anyway** → the PDF should appear as an attachment in the composer.
3. Repeat step 1 → **Upload clean text instead** → a `resume_poisoned.clean.txt` should appear as the attachment.
4. Repeat step 1 → **Cancel** → nothing attached.
5. Drag `resume_poisoned.pdf` from Finder onto the composer instead of using the paperclip → same modal.
6. Control: attach `corpus/demo/resume_clean.pdf` → no modal, it attaches directly. Same for the four
   `resume_<n>_*.pdf` files.
7. Control: attach a PNG → no modal.

## 6. N0 report: fill in per site

| Site | Paperclip intercepted | Upload anyway attaches | Upload clean attaches | Drag-and-drop intercepted | Paste guard + Paste clean works |
|---|---|---|---|---|---|
| chatgpt.com | | | | | |
| claude.ai | | | | | |
| gemini.google.com | | | | | |

If "Upload anyway" or "Upload clean" does not attach on a site that matters for the demo, set
`UPLOAD_REPLAY_SUPPORTED = false` in `extension/lib/config.ts`: the modal then only offers "Cancel upload" and
shows the findings. Write what happened in `docs/PROGRESS.md` under Nisha.

## 6b. Automated control run (optional, 2 minutes)

`extension/scripts/smoke/corpus.sh` pushes all 81 corpus items through the extension headless: X-ray for every
HTML item, the upload guard for every PDF, and prints a table against `corpus/manifest.json`. Last run
(2026-11-14): demo 7/7, benign 23/23 clean (no false alarms), obvious payloads all caught; "subtle" payloads are
found but score under the 0.5 flag threshold, which is the scorer's decision, not the UI's.

## 7. When something goes wrong

- Page side: right-click → Inspect → **Console**. Copy any line with `[HiddenInk]` or any red error.
- Extension side: `chrome://extensions` → HiddenInk card → **service worker** link opens its console.
- Popup says "can't scan this page": it's a `chrome://` page, the Web Store, or a file URL without
  "Allow access to file URLs". Reload the tab after changing permissions.
- Modal never appears on a PDF: check the console for `[HiddenInk] PDF scan failed`. On error the upload is
  deliberately let through (fail open), so the file attaching with no modal can mean a scan error, not a clean file.
- After a rebuild nothing changed: you forgot the reload icon on the extension card, or the tab wasn't refreshed.

## 8. Stage 1 "done" checklist (section 7 of the brief)

- [ ] `resume_poisoned.pdf` → ChatGPT triggers the upload guard with the hidden line highlighted
- [ ] X-ray on `job_listing_poisoned.html` highlights every hidden snippet with hover cards
- [ ] Pasting the job listing into ChatGPT triggers paste guard; "Paste clean" works
- [ ] Clean résumés, the scanned PDF and the normal pages produce no flagged findings
- [ ] `eval/run_local.py` prints detection and false-alarm rates (Rukmini)
- [ ] vitest passes (Rukmini)
- [ ] README explains install, regenerating test files, running the eval
