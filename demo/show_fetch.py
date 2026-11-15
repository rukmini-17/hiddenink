#!/usr/bin/env python3
"""show_fetch.py <url> — the "spot the difference" scene (no model involved).

Prints, side by side:
  1. What a plain agent fetch tool receives: the page's HTML converted to text, with the
     HIDDEN fragments highlighted in red. This is what the AI actually reads.
  2. What a human sees: the same page with the hidden fragments removed.

"Hidden" = text inside display:none / visibility:hidden, class "x" / "ai-note", or
white-on-white color — the tricks on the demo page. Pure stdlib; fetches over HTTP.

Usage:  python3 demo/show_fetch.py http://localhost:8791/quickstart.html
"""
import sys
import urllib.request
from html.parser import HTMLParser

RED = "\033[31m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"

SKIP = {"script", "style", "noscript", "template", "svg"}
VOID = {"br", "img", "meta", "link", "input", "hr", "source", "col"}
BLOCK = {
    "p", "div", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "section",
    "article", "header", "footer", "nav", "tr", "table", "pre", "blockquote", "title",
}


def _hidden(attrs) -> bool:
    d = {k: (v or "") for k, v in attrs}
    style = d.get("style", "").replace(" ", "").lower()
    classes = d.get("class", "").split()
    if "display:none" in style or "visibility:hidden" in style:
        return True
    if "x" in classes or "ai-note" in classes:
        return True
    return any(c in style for c in ("color:#fff", "color:#ffffff", "color:white"))


class Extractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.segments: list[tuple[str, bool]] = []  # (text, hidden)
        self.stack: list[bool] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP:
            self.skip += 1
            return
        if tag in BLOCK or tag == "br":
            self.segments.append(("\n", False))
        if tag not in VOID:
            self.stack.append(_hidden(attrs) or (self.stack[-1] if self.stack else False))

    def handle_startendtag(self, tag, attrs):
        if tag in BLOCK or tag == "br":
            self.segments.append(("\n", False))

    def handle_endtag(self, tag):
        if tag in SKIP and self.skip:
            self.skip -= 1
            return
        if tag in BLOCK:
            self.segments.append(("\n", False))
        if tag not in VOID and self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if self.skip == 0:
            self.segments.append((data, bool(self.stack and self.stack[-1])))


def _lines(segments, include_hidden: bool, colorize: bool) -> str:
    out = []
    for text, hidden in segments:
        if hidden and not include_hidden:
            continue
        if hidden and colorize:
            text = f"{RED}{text}{RESET}"
        out.append(text)
    raw = "".join(out)
    # collapse whitespace runs of blank lines, strip each line
    kept = []
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped or (kept and kept[-1]):
            kept.append(stripped)
    return "\n".join(kept).strip()


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: python3 demo/show_fetch.py <url>")
    url = sys.argv[1]
    with urllib.request.urlopen(url, timeout=15) as resp:
        html = resp.read().decode("utf-8", "replace")
    p = Extractor()
    p.feed(html)

    agent_view = _lines(p.segments, include_hidden=True, colorize=True)
    human_view = _lines(p.segments, include_hidden=False, colorize=False)
    hidden_bits = [t.strip() for t, h in p.segments if h and t.strip()]

    bar = "═" * 72
    print(f"\n{BOLD}{bar}{RESET}")
    print(f"{BOLD} 1. What the AI's fetch tool receives (HTML → text){RESET}")
    print(f"{DIM}    hidden fragments in {RESET}{RED}red{RESET}{DIM} are invisible to a human{RESET}")
    print(f"{BOLD}{bar}{RESET}")
    print(agent_view)
    print(f"\n{BOLD}{bar}{RESET}")
    print(f"{BOLD} 2. What a human sees (hidden fragments removed){RESET}")
    print(f"{BOLD}{bar}{RESET}")
    print(human_view)
    print(f"\n{BOLD}{bar}{RESET}")
    print(f"{BOLD} The difference — {len(hidden_bits)} hidden fragment(s) the AI reads but you don't:{RESET}")
    for bit in hidden_bits:
        print(f"   {RED}• {bit}{RESET}")
    print(f"{BOLD}{bar}{RESET}\n")


if __name__ == "__main__":
    main()
