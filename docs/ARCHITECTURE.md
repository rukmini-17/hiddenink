# HiddenInk architecture

How each detector works and its known limitations. Kept short so the team can explain it to judges.

## Packages

- `core/`: detection engine (pure TypeScript). Ships as ESM for the extension and as an IIFE bundle
  (`window.HiddenInk`) for injection into arbitrary pages (eval runner, Stage 2 server).
- `extension/`: WXT Chrome extension (X-ray, paste guard, upload guard).
- `corpus/`: generated attack and benign test items + `manifest.json`.
- `eval/`: Playwright runner that measures detection and false-alarm rates.

## Detectors

### Web (R1): `core/src/web/`

`scanDocument(document)` walks every text node in `<body>` (skipping script/style/noscript/template/svg)
and asks `classify.ts` whether a person can see it. Checks run in this order; the first match wins:

| Technique | Rule (thresholds in `limits.ts`) |
|---|---|
| `display_none` | an ancestor has `display:none`, `visibility:hidden`, or `checkVisibility()` is false (closed `<details>`, `content-visibility:hidden`) |
| `transparent` | product of ancestor opacities < 0.1, or `color` / `-webkit-text-fill-color` alpha < 0.05 |
| `tiny_font` | computed font-size < 4px |
| `offscreen` | the text's rect is entirely outside the scrollable document, or > 3 viewports to the right |
| `clipped` | sr-only pattern; `clip: rect(0 0 0 0)`; `clip-path: inset(≥45%)`/`circle(0)`; zero-area rect (catches `transform: scale(0)`); or its visible area after intersecting every `overflow:hidden` ancestor is ≤ 2px² |
| `low_contrast` | WCAG contrast < 1.3 between text color and the *effective* background (ancestors' background colors composited down to the first opaque one, over a white canvas) |

Hidden text nodes are **grouped by the element that hides them** (e.g. the `display:none` ancestor, or
the outermost inline element sharing the same white color), so one hidden sentence split across
`<b>`/`<i>` is one finding. Each finding has a CSS `selector` and a `bbox` of `[x, y, width, height]` in
**document coordinates (CSS px)**: add `scrollX/scrollY`, which we've already done.

Other sources (`sources.ts`), reported **only when the text scores as AI-aimed**: `attr_text` for
`alt`, `title`, `aria-label`, `aria-description` and description `<meta>` tags (≥ 20 chars);
`html_comment` for comments anywhere in the document. Every text node and attribute also goes through
the Unicode scanner, since invisible characters can hide inside visible text.

**False-alarm exceptions** (all tested):
- **sr-only** (absolute, ≤ 1.5px box, overflow hidden/clip): dropped unless the text is AI-aimed. Then it's
  `clipped` with the reason "uses the screen-reader-only pattern…".
- **display:none / collapsed**: dropped unless longer than 40 chars or AI-aimed (menus, tabs, modals).
- **Background images**: if one sits between the text and the first opaque background color, we skip
  the contrast check entirely (we can't know the image's colors, and white-on-photo hero text is normal).
- **Native `<select>` options** are zero-size until opened, so they're treated as visible.
- Hidden snippets under 3 chars (icons, "×") are ignored.

Non-AI-aimed hidden text is still returned, but with `flagged: false`. The UI should show only flagged findings.

`visibleText`: the visible text nodes in order, with a newline whenever the nearest block container
changes, then passed through `cleanText`.

**`scanClipboardHtml(html)`** (paste guard) reuses the same pipeline (`engine.ts`) with a different
classifier. A `DOMParser` document has no layout (and never runs scripts or loads images), so
`scanClipboardHtml.ts` reads **inline `style=""` only**. That works because Chrome inlines computed
styles (color, background-color, font-size…) when you copy. It detects display/visibility, opacity,
transparent color, font-size in px/pt, far-negative `left`/`top`/`text-indent`, zero-size + overflow
hidden, `max-height:0`, `clip`/`clip-path`, `scale(0)`, and low contrast. **Low contrast needs an
explicit inline background**: copying light text from a dark page gives no background, and assuming
white would flag everything.

**Limitations**: background images (above); text inside SVG, iframes and shadow roots isn't scanned;
text covered by another element (z-index overlap) isn't detected (PDF render-and-sample handles that
case, the web engine doesn't); `::before/::after` content isn't scanned; colors via CSS filters or
`mix-blend-mode` aren't modeled. In clipboard HTML, relative units (em, %) are unknown and ignored.

**Performance**: one `getComputedStyle` per element (cached per scan) and one Range rect per text
node. A 3,000-paragraph page scans in ~50 ms in Chrome.

### Unicode (R2)

- Unicode (R2):
- Unicode (R2): `core/src/unicode/`. `segment.ts` splits text into visible stretches and invisible runs and
  decides which runs are legitimate; `scanUnicode` reports the rest and `cleanText` drops them. Both use the
  same segmentation, so they never disagree. Thresholds live in `limits.ts`.
  - `unicode_tags` (U+E0000–E007F): decoded to ASCII. Flagged if the decoded text is readable.
    Exception: U+1F3F4 + 2–6 tag letters/digits + cancel tag = subdivision flag (England, Scotland, Wales).
  - `zero_width` (U+200B–200D, U+2060, U+FEFF): flagged when ≥3 in a row, or ≥8 scattered through one text.
    Two-symbol runs are tried as binary (8 bits/char) and decoded if readable. Not flagged: one leading BOM,
    a ZWJ inside an emoji sequence, a lone ZWJ/ZWNJ between non-Latin letters (Persian, Hindi…).
  - `bidi` (U+202A–202E, U+2066–2069): every run is reported; only overrides (U+202D/202E) are flagged,
    because isolates and embeddings appear in normal right-to-left text and in chat apps around usernames.
  - `variation_selectors` (U+FE00–FE0F, U+E0100–E01EF): runs of ≥3 are flagged and decoded as bytes
    ("emoji smuggling"). A single selector after an emoji is normal.
  - Limitations: lone ZWJ/ZWNJ between Latin letters only count toward the "scattered" total; other
    invisible characters (e.g. U+180E, U+2061–2064 invisible math operators) aren't covered yet.

### AI-aimed scorer (R3, first version, built with R1): `core/src/scorer/`

`scoreAiAimed(text)` → `{ score, reasons }`. All signals and weights are in **`config.ts`**. Each
signal is a regex that fires at most once, and the weights combine as a noisy-OR:
`score = 1 − Π(1 − weight)`. That keeps the score in 0–1, and each extra signal adds less. Strongest
signals: override ("ignore previous instructions", 0.6), ranking manipulation with a target and a push
to the top ("rank this candidate first", 0.55), "positive review only" (0.5), secrecy and role hijack
(0.4), addressing an AI with an instruction or talking about "the user" (0.35). Weak supporting
signals: imperative phrasing, money/urgency words, links, length. Every fired signal adds its plain
reason to `reasons`. `applyScore` scores `decoded` when there is one (that's what the AI reads),
and sets `flagged = flagged || score ≥ 0.5`.
`test/scorer.test.ts` pins the demo payloads above 0.5 and everyday UI strings ("Rate this product",
"Please verify your email…", cookie banners) below it.

Limitation: keyword heuristics miss paraphrased or non-English instructions. That's the job of the
Stage 2 classifier.

### Testing

`core/vitest.workspace.ts` has two projects: **unit** (jsdom: Unicode, scorer, API shape) and
**browser** (headless Chrome via Playwright: web engine and clipboard). The web engine needs
real layout (rects, computed styles, `checkVisibility`), which jsdom doesn't implement.
Browser tests use the installed Google Chrome (`channel: "chrome"`), so no Playwright browser
download is needed. Set `PW_BUNDLED_CHROMIUM=1` to use Playwright's own Chromium instead.

### PDF (R4)

- PDF (R4):
