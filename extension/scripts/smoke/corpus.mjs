// N6 control run: push every corpus item through the extension itself (headless Chromium, real engine).
//   HTML items → X-ray toggle on the page, count flagged findings.
//   PDF items  → upload through the guard on a fake chatgpt.com page: modal (flagged) or pass-through (clean).
// Prints a table and a summary. Usage: node corpus.mjs <extension dir> <corpus dir>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [EXT, CORPUS] = process.argv.slice(2);
const manifestRaw = JSON.parse(fs.readFileSync(path.join(CORPUS, "manifest.json"), "utf8"));
const items = Array.isArray(manifestRaw) ? manifestRaw : manifestRaw.items;

const FAKE_CHAT = `<!doctype html><html><head><title>fake chat</title></head><body>
<input id="file" type="file" multiple><pre id="log"></pre>
<script>
  document.getElementById('file').addEventListener('change', (e) => { document.getElementById('log').textContent += 'change:' + [...e.target.files].map(f => f.name).join(',') + "\\n"; });
</script></body></html>`;

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".txt": "text/plain" };

const ctx = await chromium.launchPersistentContext("", { channel: "chromium", headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
const rows = [];
try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker");
  await sw.evaluate(() => chrome.storage.sync.set({ testMode: false }));

  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.text().includes("[HiddenInk]")) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.route("https://chatgpt.com/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: FAKE_CHAT }));
  await page.route("https://corpus.test/**", (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.slice(1));
    const file = path.join(CORPUS, rel);
    if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: "not found" });
    r.fulfill({ status: 200, contentType: MIME[path.extname(file)] ?? "application/octet-stream", body: fs.readFileSync(file) });
  });

  const xray = async (type) => {
    for (let i = 0; i < 10; i++) {
      try {
        return await sw.evaluate(async (type) => { const [tab] = await chrome.tabs.query({ active: true }); return chrome.tabs.sendMessage(tab.id, { type }); }, type);
      } catch (e) { await page.waitForTimeout(200); }
    }
    throw new Error("content script did not answer");
  };

  // ---- HTML items: X-ray ------------------------------------------------------------------
  for (const it of items.filter((i) => i.type === "html")) {
    const t0 = Date.now();
    await page.goto(`https://corpus.test/${it.path}`, { waitUntil: "load" });
    await page.waitForTimeout(150);
    const status = await xray("xray:toggle");
    await xray("xray:toggle");
    rows.push({ id: it.id, type: "html", expected: it.should_flag, flagged: status.flagged, total: status.total, ms: Date.now() - t0 });
  }

  // ---- PDF items: upload guard ----------------------------------------------------------------
  await page.goto("https://chatgpt.com/", { waitUntil: "load" });
  await page.waitForTimeout(300);
  const guardText = () => page.evaluate(() => document.querySelector("hiddenink-guard")?.shadowRoot?.textContent ?? ""); // plain evaluate: a locator would wait 30 s when the host does not exist yet
  for (const it of items.filter((i) => i.type === "pdf")) {
    const name = path.basename(it.path);
    const t0 = Date.now();
    await page.evaluate(() => { document.getElementById("file").value = ""; document.getElementById("log").textContent = ""; });
    await page.setInputFiles("#file", path.join(CORPUS, it.path));
    let outcome = "timeout";
    try {
      await page.waitForFunction((name) => document.querySelector("hiddenink-guard")?.shadowRoot?.textContent?.includes("Upload anyway") || document.getElementById("log").textContent.includes("change:" + name), name, { timeout: 60000 });
      const txt = await guardText();
      outcome = /Upload anyway/.test(txt) ? "modal" : "passed";
      var n = Number((txt.match(/This PDF has (\d+) hidden/) || [])[1] ?? 0);
      if (outcome === "modal") await page.locator("hiddenink-guard").locator("button", { hasText: "Cancel" }).click();
    } catch {}
    rows.push({ id: it.id, type: "pdf", expected: it.should_flag, flagged: outcome === "modal" ? n : 0, total: outcome === "modal" ? n : 0, ms: Date.now() - t0, outcome });
    await page.waitForTimeout(100);
  }

  // ---- Report -------------------------------------------------------------------------------------------
  const ok = (r) => (r.expected ? r.flagged > 0 : r.flagged === 0);
  console.log("id".padEnd(44) + "type  expected  flagged/total  ms     ok");
  for (const r of rows) console.log(`${r.id.padEnd(44)}${r.type.padEnd(6)}${String(r.expected).padEnd(10)}${`${r.flagged}/${r.total}`.padEnd(15)}${String(r.ms).padEnd(7)}${ok(r) ? "ok" : "MISS" + (r.outcome === "timeout" ? " (timeout)" : "")}`);
  const sum = (pred) => { const xs = rows.filter(pred); return `${xs.filter(ok).length}/${xs.length}`; };
  console.log(`\nattack html caught:   ${sum((r) => r.type === "html" && r.expected)}`);
  console.log(`attack pdf caught:    ${sum((r) => r.type === "pdf" && r.expected)}`);
  console.log(`benign html clean:    ${sum((r) => r.type === "html" && !r.expected)}`);
  console.log(`benign pdf clean:     ${sum((r) => r.type === "pdf" && !r.expected)}`);
  console.log(`demo items:           ${sum((r) => r.id.startsWith("demo"))}`);
  if (errors.length) console.log("\nconsole:\n" + [...new Set(errors)].slice(0, 10).join("\n"));
} finally {
  await ctx.close();
}
