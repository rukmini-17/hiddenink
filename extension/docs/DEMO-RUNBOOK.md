# HiddenInk demo runbook

Follow the parts in order. Each step says what to do and what you should see.
If what you see is different, write it down and go to Part 9.

Commands run from the `hiddenink/` folder in Terminal. Nothing is installed on your Mac: builds run in Docker.

---

## Part 1. Before you start

- [ ] **Docker Desktop is running.** Look for the whale icon in the Mac menu bar. If it isn't there, open the Docker app and wait until it says "running".
- [ ] **You are in the right folder.**
  ```bash
  cd ~/Documents/Masters/HackUMass/codebase/hiddenink
  ```
- [ ] **You have the latest code.**
  ```bash
  git checkout feature/frontend
  git pull origin feature/frontend
  ```

---

## Part 2. Build the extension

Only needed after code changes. If you're unsure, run it. It takes under a minute.

```bash
extension/scripts/node-docker.sh pnpm install
extension/scripts/node-docker.sh pnpm build:core
extension/scripts/node-docker.sh pnpm --filter @hiddenink/extension build
```

- [ ] The last command ends with **"✔ Built extension"**.

The result is in `extension/.output/chrome-mv3/`. That folder starts with a dot, so Finder hides it (see Part 3).

---

## Part 3. Load the extension in Chrome

**First time only:**

1. [ ] Open Chrome and go to `chrome://extensions`.
2. [ ] Turn on **Developer mode** (switch in the top right corner).
3. [ ] Click **Load unpacked**.
4. [ ] In the file picker, press **Cmd + Shift + G**, paste this path, press Enter, then click **Select**:
   ```
   /Users/nishasuresh/Documents/Masters/HackUMass/codebase/hiddenink/extension/.output/chrome-mv3
   ```
5. [ ] Click the puzzle-piece icon in Chrome's toolbar and pin **HiddenInk**. You should now see its icon (a shield with an eye) in the toolbar.

**Every time after a rebuild:**

1. [ ] On `chrome://extensions`, click the **reload arrow** on the HiddenInk card.
2. [ ] Refresh any tab you are testing in. Old tabs keep running the old version.

---

## Part 4. Turn Test mode OFF

Test mode is our own setting that shows **fake** warnings on everything. It's only for development. If it's on during the demo, a clean résumé will show a warning and look like a false alarm.

1. [ ] Click the HiddenInk icon in the toolbar.
2. [ ] Look at the bottom of the popup. If you see a small **"Test mode on"** label, it's on.
3. [ ] If it's on: click **Settings** in the popup, untick **Test mode**, click **Save**.

Safety net: while Test mode is on, every HiddenInk warning box shows a bold **TEST MODE** badge at the top. If you ever see that badge, stop and turn it off.

Test mode is synced to your Google account, so check it on whichever laptop you demo on.

---

## Part 5. X-ray on the poisoned job listing

1. [ ] In Terminal, start the demo page server and leave it running:
   ```bash
   extension/scripts/serve-demo.sh
   ```
2. [ ] In Chrome, open <http://localhost:8787/job_listing_poisoned.html>.
3. [ ] Click the HiddenInk icon (the shield with an eye) in the toolbar and switch **X-ray this page** on.

You should see:

- [ ] The page goes dark. Normal text stays readable but muted.
- [ ] The hidden lines appear in glowing teal text where they sit on the page. No boxes, no tags.
- [ ] A small bar at the top says **"X-ray on"** with the number of hidden items.
- [ ] Nothing else opens by itself.
- [ ] The toolbar icon shows the same number in a small teal badge.

Try it out:

4. [ ] Hover over a glowing line. It gets brighter. No popup appears.
5. [ ] Click a glowing line. A dark card opens beside it: **"There is hidden text here"**, the hidden text, how it was hidden, and a **High** or **Medium** badge.
6. [ ] Click **Copy text**. The button says "Copied".
7. [ ] Click **View all**. A list of every hidden item opens. Items that aren't on the page say "Not shown on the page". Click an item to jump to it.
8. [ ] Press **Esc** to close the card or list. X-ray stays on.
9. [ ] Scroll up and down. The glowing text stays on its spot.
10. [ ] Click the **X** in the top bar. Everything goes back to normal.

Control check (should show nothing):

11. [ ] Open any normal website, for example a news article, and turn X-ray on.
12. [ ] The top bar says **"No hidden instructions found"**. Click the X to turn it off.

When you're done with the whole runbook, stop the server with **Ctrl + C** in Terminal.

---

## Part 6. Paste guard on chatgpt.com

The paste guard only reacts when the copied text has hidden instructions in it. Normal pastes go straight through.

**Copy the poisoned text:**

1. [ ] Go to the job listing tab from Part 5. Make sure X-ray is **off**.
2. [ ] Click anywhere on the page, press **Cmd + A** (select all), then **Cmd + C** (copy).

**Paste it into ChatGPT:**

3. [ ] Open chatgpt.com and click in the message box.
4. [ ] Press **Cmd + V**.
5. [ ] A HiddenInk box appears: **"Hidden instructions in what you're pasting"**. It lists each hidden item with a **High** or **Medium** badge and has four buttons: **Show me**, **Cancel**, **Paste anyway**, **Paste clean**. It is light or dark to match the chat site.
6. [ ] Click **Show me**. Each item shows its full text and how it was hidden.
7. [ ] Click **Paste clean**. The message box now has the job listing **without** the hidden lines.
8. [ ] Clear the message box. Do not send anything.

**Try the other buttons:**

9. [ ] Paste again (Cmd + V), click **Paste anyway**. The full original text appears. Clear the box.
10. [ ] Paste again, click **Cancel**. The box closes and nothing is pasted.

**Control check:**

11. [ ] Type a normal sentence in the Notes app, copy it, paste it into ChatGPT. **No** HiddenInk box should appear.

---

## Part 7. Upload guard on chatgpt.com

The demo files are in `hiddenink/corpus/demo/`. Upload **one file at a time**.

**Poisoned résumé, with the attach button:**

1. [ ] In ChatGPT, click the **attach / paperclip** button and pick `resume_poisoned.pdf`.
2. [ ] A HiddenInk box appears: **"Hidden text found in resume_poisoned.pdf"**. It shows a small picture of the page with the hidden line highlighted, the hidden text with a **High** or **Medium** badge, and three buttons: **Upload anyway**, **Cancel**, **Upload clean text instead**.
3. [ ] The file is **not** attached yet.
4. [ ] Click **Upload anyway**. The PDF should now appear as an attachment in the message box. Remove it.
5. [ ] Attach `resume_poisoned.pdf` again, click **Upload clean text instead**. A file called `resume_poisoned.clean.txt` should appear as the attachment. Remove it.
6. [ ] Attach it again, click **Cancel**. Nothing is attached.

**Poisoned résumé, with drag and drop:**

7. [ ] Drag `resume_poisoned.pdf` from Finder onto the ChatGPT message box.
8. [ ] The same HiddenInk box appears. Click **Cancel**.

**Control checks (no box should appear):**

9. [ ] Attach `resume_clean.pdf`. It attaches straight away. Remove it.
10. [ ] Attach any of the four `resume_1_...` to `resume_4_...` files. Same: no box. Remove it.
11. [ ] Attach any image. No box.

Don't send any messages. We are only testing attaching.

---

## Part 8. Repeat on claude.ai and gemini.google.com

Do **Part 6** and **Part 7** again on:

- [ ] claude.ai
- [ ] gemini.google.com

Then fill in this table. Write **yes**, **no**, or a short note.

| Check | chatgpt.com | claude.ai | gemini.google.com |
|---|---|---|---|
| Paste: box appears (Part 6 step 5) | | | |
| Paste clean works (step 7) | | | |
| Paste anyway works (step 9) | | | |
| Cancel works (step 10) | | | |
| Normal paste has no box (step 11) | | | |
| Attach: box appears (Part 7 step 2) | | | |
| Upload anyway attaches the PDF (step 4) | | | |
| Upload clean attaches the .txt (step 5) | | | |
| Drag and drop shows the box (step 8) | | | |
| Clean résumés have no box (steps 9–10) | | | |

**What the answers decide:**

- If **Upload anyway** or **Upload clean** don't attach the file on a site, tell Claude Code. It will switch that behaviour off (`UPLOAD_REPLAY_SUPPORTED = false`), so the box only offers Cancel and shows the findings.
- If **Paste clean** doesn't put text in the message box on a site, tell Claude Code. The paste fallback needs adjusting there.
- Use the site where everything says **yes** for the live demo.

Copy the finished table into `docs/PROGRESS.md` under the Nisha heading.

---

## Part 9. When something goes wrong

| What you see | What to do |
|---|---|
| Nothing changed after a rebuild | Click the reload arrow on the HiddenInk card in `chrome://extensions`, then refresh the tab. |
| Popup says "HiddenInk can't scan this page" | That page type can't be scanned (`chrome://` pages, the Chrome Web Store). Use the localhost demo page. |
| X-ray finds nothing on the demo page | Make sure you opened the `http://localhost:8787/...` address, not the file directly. |
| A PDF attaches with no box, but it should have one | Right-click the page, choose **Inspect**, open **Console**, look for a line starting with `[HiddenInk]`. On any error HiddenInk lets the upload through on purpose. |
| A clean file shows a warning | Check Part 4. If the box has a **TEST MODE** badge, turn Test mode off. |
| Anything else | Right-click the page, **Inspect**, **Console**. Copy any red lines or `[HiddenInk]` lines and send them to Claude Code with the Part and step number. |

---

## Part 10. Optional automated checks

These run in Docker on fake pages, not on the real chat sites. Good for checking nothing broke after a code change.

```bash
extension/scripts/smoke/run.sh       # 37 checks of X-ray, paste guard and upload guard
extension/scripts/smoke/corpus.sh    # all 81 test files through the extension, about 2 minutes
```

- [ ] `run.sh` ends with **"37/37 checks passed"**.
- [ ] `corpus.sh` shows **demo items 7/7**, **benign html clean 12/12** and **benign pdf clean 11/11**.

---

## Stage 1 "done" checklist (from the team brief)

- [ ] Uploading `resume_poisoned.pdf` to ChatGPT shows the upload guard with the hidden line highlighted.
- [ ] X-ray on `job_listing_poisoned.html` reveals every hidden snippet, and clicking one opens its card.
- [ ] Pasting the job listing into ChatGPT shows the paste guard, and "Paste clean" works.
- [ ] Clean résumés, the scanned PDF and the normal pages show no warnings.
- [ ] `eval/run_local.py` prints the detection rate and false-alarm rate. *(Rukmini)*
- [ ] vitest passes. *(Rukmini)*
- [ ] README explains how to install the extension, regenerate the test files and run the eval.
