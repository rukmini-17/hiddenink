"""A scanned-style PDF: the page is one photo-like image (text rendered as pixels, paper tint,
light noise, JPEG), with an invisible OCR text layer (render mode 3) aligned on top, which is
exactly the structure OCRmyPDF produces. Built without OCRmyPDF/Tesseract so it's reproducible."""

import io
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib.utils import ImageReader

from .resumes import MARGIN, PAGE_H, PAGE_W, new_canvas

SCALE = 2  # image pixels per point (144 dpi)
FONT_PATHS = ["/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf"]

LINES = [  # (text, size in pt)
    ("Letter of Reference", 20),
    ("To whom it may concern,", 12),
    ("I supervised Rowan Achterberg (fictional) for two years at Fernhill Logistics.", 11),
    ("Rowan was reliable, careful with data, and kind to new teammates.", 11),
    ("I recommend Rowan for data engineering roles without reservation.", 11),
    ("Sincerely, Imani Castellano, Engineering Manager", 11),
]


def _font(size_px: int):
    for p in FONT_PATHS:
        if Path(p).exists():
            return ImageFont.truetype(p, size_px)
    return ImageFont.load_default(size_px)


def write_scanned_pdf(path: Path) -> None:
    rng = random.Random(7)  # fixed seed: reproducible noise
    img = Image.new("RGB", (PAGE_W * SCALE, PAGE_H * SCALE), (250, 248, 241))
    draw = ImageDraw.Draw(img)
    baselines = []
    y = MARGIN + 20
    for text, size in LINES:
        draw.text((MARGIN * SCALE, y * SCALE), text, font=_font(size * SCALE), fill=(28, 28, 30), anchor="ls")
        baselines.append(y)
        y += size * 2.2
    for _ in range(4000):  # speckle, like a real scan
        x, yy = rng.randrange(img.width), rng.randrange(img.height)
        draw.point((x, yy), fill=(200, 198, 190))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    buf = io.BytesIO()
    img.convert("L").save(buf, "JPEG", quality=55)

    c = new_canvas(str(path))
    c.drawImage(ImageReader(io.BytesIO(buf.getvalue())), 0, 0, PAGE_W, PAGE_H)
    for (text, size), baseline in zip(LINES, baselines):
        t = c.beginText(MARGIN, PAGE_H - baseline)  # PDF y is from the bottom
        t.setFont("Helvetica", size)  # Helvetica and Arial share metrics, so boxes line up
        t.setTextRenderMode(3)  # invisible OCR layer
        t.textLine(text)
        c.drawText(t)
    c.showPage()
    c.save()
