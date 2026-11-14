"""PDFs printed from HTML by Chrome (Playwright): the way a Google Docs / browser "Save as PDF"
file looks, with real embedded fonts, ligatures and kerning. Uses the installed Google Chrome,
so no Playwright browser download is needed."""

import re
from pathlib import Path

from playwright.sync_api import Browser, sync_playwright

from .manifest import CORPUS_DIR, Item, Manifest
from .payloads import pick

PAPER_HTML = """<!doctype html><meta charset="utf-8"><style>
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.45; margin: 0 8px; }
h1 { font-size: 17pt; text-align: center; margin-bottom: 2px } .authors { text-align: center; font-size: 10pt }
.abstract { margin: 14px 40px; font-size: 9.5pt } h2 { font-size: 12pt; margin-top: 18px }
sup { font-size: 6pt } figcaption, .footnotes { font-size: 7.5pt; color: #444 }
table { border-collapse: collapse; margin: 8px auto; font-size: 9pt } td, th { border: 1px solid #999; padding: 3px 8px }
.page-break { page-break-before: always }
</style>
<h1>Sparse Routing for Small Mixture-of-Experts Models</h1>
<p class="authors">Tolu Okonkwo<sup>1</sup>, Lena Haverford<sup>2</sup><br>
<sup>1</sup>Eastbrook University &nbsp; <sup>2</sup>Lakemont Institute (fictional)</p>
<div class="abstract"><b>Abstract.</b> We compare three routing strategies for mixture-of-experts models
under 1B parameters. Top-2 routing with a load-balancing loss gives a 1.8% average gain on two
benchmarks<sup>3</sup>, at a 6% compute cost. We release no code; all results are illustrative.</div>
<h2>1 Introduction</h2>
<p>Mixture-of-experts (MoE) layers route each token to a subset of expert networks [1]. Most prior
work studies large models; we ask whether routing choices matter at small scale.</p>
<h2>2 Method</h2>
<p>We train models with 4, 8 and 16 experts and compare top-1, top-2 and hash routing. The loss is
L = L<sub>task</sub> + α · L<sub>balance</sub>, with α = 0.01.</p>
<table><tr><th>Routing</th><th>Bench A</th><th>Bench B</th></tr>
<tr><td>Top-1</td><td>61.2</td><td>48.0</td></tr><tr><td>Top-2</td><td>62.9</td><td>49.6</td></tr>
<tr><td>Hash</td><td>60.1</td><td>47.2</td></tr></table>
<figure><figcaption>Table 1: Accuracy (%) by routing strategy, 8 experts.</figcaption></figure>
<div class="page-break"><h2>3 Results</h2>
<p>Top-2 routing is consistently best, but gains shrink as the number of experts grows. Hash routing
is cheapest and within 2 points of the best result.</p>
<h2>4 Conclusion</h2><p>At small scale, routing choice matters less than expert count.</p>
<div class="footnotes"><p><sup>3</sup> Benchmarks A and B are synthetic tasks defined in the appendix.</p>
<p>[1] A. Author. Routing in mixture models. Journal of Examples, 2024.</p></div></div>
"""

PAGE_NUMBERS = {
    "display_header_footer": True,
    "header_template": '<div style="font-size:6px;width:100%;text-align:center;color:#666">Preprint (fictional)</div>',
    "footer_template": '<div style="font-size:7px;width:100%;text-align:center"><span class="pageNumber"></span></div>',
    "margin": {"top": "48px", "bottom": "48px", "left": "40px", "right": "40px"},
}

STYLED_RESUME_HTML = """<!doctype html><meta charset="utf-8"><style>
body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt; margin: 0 8px; color: #222 }
.band { background: #1f2a44; color: #fff; padding: 14px 18px } .band h1 { margin: 0; font-size: 22pt }
h2 { font-size: 12pt; border-bottom: 1px solid #ccc; margin-top: 16px } .muted { color: #888 }
</style>
<div class="band"><h1>Noor Halvorsen</h1><div>Platform Engineer · noor.h@example.com · (555) 010-0142</div></div>
<h2>Experience</h2>
<p><b>Platform Engineer, Quillstone Analytics</b> (2021–now)<br>Built the internal deploy tool used by 40 teams.</p>
<p><b>DevOps Engineer, Pinecrest Media</b> (2018–2021)<br>Moved CI from Jenkins to GitHub Actions.</p>
<h2>Skills</h2><p>Kubernetes, Terraform, Go, Python</p>
<p class="muted">References available on request.</p>
%HIDDEN%
"""


def build_chrome_pdfs(m: Manifest) -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome")
        try:
            _print(browser, PAPER_HTML, CORPUS_DIR / "benign/pdf/academic_paper.pdf", PAGE_NUMBERS)
            m.add(Item(id="pdf_benign_academic_paper", path="benign/pdf/academic_paper.pdf", type="pdf",
                       label="benign", description="Two-page paper: superscripts, footnotes, table, page numbers"))

            _print(browser, STYLED_RESUME_HTML.replace("%HIDDEN%", ""), CORPUS_DIR / "benign/pdf/resume_styled_chrome.pdf", PAGE_NUMBERS)
            m.add(Item(id="pdf_benign_resume_styled_chrome", path="benign/pdf/resume_styled_chrome.pdf", type="pdf",
                       label="benign", description="Chrome-printed résumé with a dark band, grey text, header/footer"))

            # Same résumé with white 11px text: what a hand-made Google Docs attack looks like.
            hidden = f'<p style="color:#fff">{pick(3, "subtle").text}</p>'
            _print(browser, STYLED_RESUME_HTML.replace("%HIDDEN%", hidden),
                   CORPUS_DIR / "attack/pdf/pdf_invisible__chrome_white_text__subtle.pdf", PAGE_NUMBERS)
            m.add(Item(id="pdf_pdf_invisible__chrome_white_text__subtle",
                       path="attack/pdf/pdf_invisible__chrome_white_text__subtle.pdf", type="pdf", label="attack",
                       techniques=["pdf_invisible"], payload_kind="subtle",
                       description="White text in a Chrome-printed résumé (like a Google Docs export)"))
        finally:
            browser.close()


def _print(browser: Browser, html: str, path: Path, opts: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    page = browser.new_page()
    page.set_content(html)
    pdf = page.pdf(format="Letter", print_background=True, **opts)
    page.close()
    path.write_bytes(_make_reproducible(pdf))


def _make_reproducible(pdf: bytes) -> bytes:
    """Chrome stamps the time and a random file ID into every PDF. Overwrite both with fixed values
    of the SAME length, so byte offsets (the xref table) stay valid and regenerating is noise-free."""
    pdf = re.sub(rb"D:\d{14}", b"D:20260101000000", pdf)  # keeps Chrome's timezone suffix
    return re.sub(rb"/ID \[<([0-9A-Fa-f]+)> ?<([0-9A-Fa-f]+)>\]",
                  lambda mt: mt.group().replace(mt.group(1), b"0" * len(mt.group(1))).replace(mt.group(2), b"0" * len(mt.group(2))),
                  pdf)
