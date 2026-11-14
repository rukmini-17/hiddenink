"""Scan every corpus file in Chrome with the core IIFE bundle (the same code the extension runs).

HTML files are opened at file:// in a fixed-size window and scanned with scanDocument.
PDF files go through a blank harness page that holds the bundle; their bytes are passed to scanPdf.
Timing is measured inside the page around the scan call only (not page loading).
"""

import base64
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

from .metrics import FileResult

VIEWPORT = {"width": 1280, "height": 800}

# Runs in the page: scan, time it, and return only what the eval needs (keeps the payload small).
SUMMARIZE = """
  const summarize = (result, ms) => ({
    ms,
    findings: result.findings.map((f) => ({
      technique: f.technique, flagged: f.flagged, aiScore: f.aiScore,
      text: (f.decoded ?? f.text).slice(0, 120), reasons: f.reasons.slice(0, 3),
    })),
  });
"""
SCAN_DOCUMENT = "() => {" + SUMMARIZE + """
  const t = performance.now();
  const result = window.HiddenInk.scanDocument(document);
  return summarize(result, performance.now() - t);
}"""
SCAN_PDF = "async (b64) => {" + SUMMARIZE + """
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const t = performance.now();
  const result = await window.HiddenInk.scanPdf(bytes.buffer);
  return summarize(result, performance.now() - t);
}"""


class Runner:
    def __init__(self, bundle: Path, corpus: Path, repeat: int):
        self.bundle_js = bundle.read_text(encoding="utf-8")
        self.corpus = corpus
        self.repeat = max(1, repeat)
        self.chrome_version = ""
        self.pdf_cold_start_ms: float | None = None

    def run(self, items: list[dict], on_progress=None) -> list[FileResult]:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="chrome")  # installed Google Chrome, no download
            self.chrome_version = browser.version
            try:
                harness = self._pdf_harness(browser.new_page(viewport=VIEWPORT))
                self._warm_up(harness, items)
                results = []
                for n, item in enumerate(items, 1):
                    page = harness if item["type"] == "pdf" else browser.new_page(viewport=VIEWPORT)
                    results.append(self._scan_item(page, item))
                    if page is not harness:
                        page.close()
                    if on_progress:
                        on_progress(n, len(items), results[-1])
                return results
            finally:
                browser.close()

    def _pdf_harness(self, page: Page) -> Page:
        page.set_content("<!doctype html><title>HiddenInk PDF harness</title>")
        page.add_script_tag(content=self.bundle_js)
        return page

    def _warm_up(self, harness: Page, items: list[dict]) -> None:
        """The first scanPdf call pays one-time costs (JIT, pdf.js setup). Measure it once, untimed after."""
        first_pdf = next((i for i in items if i["type"] == "pdf"), None)
        if first_pdf:
            self.pdf_cold_start_ms = round(self._scan_once(harness, first_pdf)["ms"], 1)

    def _scan_once(self, page: Page, item: dict) -> dict:
        path = self.corpus / item["path"]
        if item["type"] == "pdf":
            return page.evaluate(SCAN_PDF, base64.b64encode(path.read_bytes()).decode())
        page.goto(path.resolve().as_uri(), wait_until="load")
        page.add_script_tag(content=self.bundle_js)
        return page.evaluate(SCAN_DOCUMENT)

    def _scan_item(self, page: Page, item: dict) -> FileResult:
        try:
            runs = [self._scan_once(page, item) for _ in range(self.repeat)]
            error = None
        except Exception as e:  # a crash on one file shouldn't sink the whole eval
            runs, error = [], f"{type(e).__name__}: {e}".splitlines()[0][:300]

        findings = runs[0]["findings"] if runs else []
        times = sorted(r["ms"] for r in runs)
        return FileResult(
            id=item["id"],
            type=item["type"],
            label=item["label"],
            payload_kind=item["payload_kind"],
            expected=item["techniques"],
            flagged_techniques=sorted({f["technique"] for f in findings if f["flagged"]}),
            unflagged_techniques=sorted({f["technique"] for f in findings if not f["flagged"]}),
            max_ai_score=max((f["aiScore"] for f in findings), default=0.0),
            scan_ms=round(times[len(times) // 2], 2) if times else 0.0,
            error=error,
            findings=[f for f in findings if f["flagged"]],
        )
