"""A minimal hand-written PDF, for the one trick reportlab can't produce: a font whose ToUnicode map
sends ordinary glyph codes to invisible Unicode tag characters. A viewer shows nothing unusual,
but text extraction yields tag characters that decode to an instruction. (This mirrors
core/test/pdf/makePdf.ts.)"""

from pathlib import Path

TAG_CMAP = b"""/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /HiddenInkTags def
/CMapType 2 def
1 begincodespacerange
<00> <FF>
endcodespacerange
1 beginbfrange
<20> <7E> <DB40DC20>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end"""


def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_tag_pdf(path: Path, visible_lines: list[str], hidden: str) -> None:
    """visible_lines: normal Helvetica text. hidden: drawn with the tag font in render mode 3
    (the glyphs would otherwise show as ordinary letters), extracts as Unicode tag characters."""
    ops = []
    y = 720
    for i, line in enumerate(visible_lines):
        size = 22 if i == 0 else 11
        ops.append(f"BT /F1 {size} Tf 72 {y} Td ({_esc(line)}) Tj ET")
        y -= 30 if i == 0 else 16
    ops.append(f"BT /FT 11 Tf 3 Tr 72 {y - 10} Td ({_esc(hidden)}) Tj ET")
    content = "\n".join(ops).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R /FT 5 0 R >> >> /Contents 7 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode 6 0 R >>",
        b"<< /Length %d >>\nstream\n" % len(TAG_CMAP) + TAG_CMAP + b"\nendstream",
        b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream",
    ]
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for n, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % n + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(bytes(out))
