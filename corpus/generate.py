"""Regenerate the whole HiddenInk test corpus and corpus/manifest.json.

    cd corpus && uv run generate.py

Output folders are wiped and rebuilt, so the manifest always matches what's on disk.
"""

import shutil

from hiddenink_corpus.demo import build_demo
from hiddenink_corpus.html_pages import build_web_attacks, build_web_benign
from hiddenink_corpus.manifest import CORPUS_DIR, Item, Manifest
from hiddenink_corpus.payloads import pick
from hiddenink_corpus.pdf_chrome import build_chrome_pdfs
from hiddenink_corpus.pdf_reportlab import build_pdf_attacks, build_pdf_benign
from hiddenink_corpus.rawpdf import write_tag_pdf
from hiddenink_corpus.scanned import write_scanned_pdf

OUTPUT_DIRS = ["attack", "benign", "demo"]


def main() -> None:
    for d in OUTPUT_DIRS:
        shutil.rmtree(CORPUS_DIR / d, ignore_errors=True)

    m = Manifest()
    build_web_attacks(m)
    build_web_benign(m)
    build_pdf_attacks(m)
    build_pdf_benign(m)

    write_tag_pdf(CORPUS_DIR / "attack/pdf/unicode_tags__obvious.pdf",
                  ["Riley Vance", "Junior developer", "Bootcamp graduate, one internship."],
                  pick(0, "obvious").text)
    m.add(Item(id="pdf_unicode_tags__obvious", path="attack/pdf/unicode_tags__obvious.pdf", type="pdf",
               label="attack", techniques=["unicode_tags"], payload_kind="obvious",
               description="Crafted font whose ToUnicode map turns glyphs into Unicode tag characters"))

    write_scanned_pdf(CORPUS_DIR / "benign/pdf/scanned_letter_ocr.pdf")
    m.add(Item(id="pdf_benign_scanned_letter_ocr", path="benign/pdf/scanned_letter_ocr.pdf", type="pdf",
               label="benign", description="Scanned-style page image with an aligned invisible OCR text layer"))

    build_chrome_pdfs(m)
    build_demo(m)

    out = m.write()
    counts = {label: sum(1 for i in m.items if i.label == label) for label in ("attack", "hidden_benign", "benign")}
    print(f"Wrote {len(m.items)} items to {out.relative_to(CORPUS_DIR.parent)}: {counts}")


if __name__ == "__main__":
    main()
