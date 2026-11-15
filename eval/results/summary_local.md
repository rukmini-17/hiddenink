# HiddenInk eval: rules-only baseline (local engine)

_81 files (58 attack, 21 benign, 2 hidden-benign) · commit `9b06acc-dirty` · Chrome 157.0.8103.78 · 2026-11-15 01:03 UTC_

> The corpus is team-written (81 synthetic files), so these numbers describe this corpus, not the open web. See docs/EVAL.md.

## Headline

| Metric | Result |
|---|---|
| **Attacks detected** (any flagged finding) | **34/58 (59%)** |
| Attacks detected with the right technique flagged | 34/58 (59%) |
| Obvious payloads detected | 33/33 (100%) |
| **Subtle payloads detected** | **1/25 (4%)** |
| Hidden text found (flagged or not) | 54/58 (93%) |
| **False positives: benign files** | **0/21 (0%)** |
| False positives: hidden-benign (keyword stuffing) | 0/2 (0%); still reported as hidden text: 2/2 (100%) |
| Scan time per HTML file, median / worst | 1.0 ms / 3.6 ms |
| Scan time per PDF file, median / worst | 15 ms / 63 ms |
| First PDF scan (cold start) | 70 ms |

## Per technique

| Technique | Where | Flagged | Obvious | Subtle | Found (flagged or not) |
|---|---|---|---|---|---|
| `attr_text` | html | 4/6 (67%) | 4/4 (100%) | 0/2 (0%) | 4/6 (67%) |
| `bidi` | html | 1/1 (100%) | 1/1 (100%) | n/a | 1/1 (100%) |
| `clipped` | html | 4/8 (50%) | 4/4 (100%) | 0/4 (0%) | 7/8 (88%) |
| `display_none` | html | 2/4 (50%) | 2/2 (100%) | 0/2 (0%) | 4/4 (100%) |
| `html_comment` | html | 2/3 (67%) | 2/2 (100%) | 0/1 (0%) | 2/3 (67%) |
| `low_contrast` | html | 4/7 (57%) | 4/4 (100%) | 0/3 (0%) | 7/7 (100%) |
| `offscreen` | html | 3/5 (60%) | 3/3 (100%) | 0/2 (0%) | 5/5 (100%) |
| `pdf_invisible` | pdf | 3/7 (43%) | 3/3 (100%) | 0/4 (0%) | 7/7 (100%) |
| `pdf_offpage` | pdf | 1/2 (50%) | 1/1 (100%) | 0/1 (0%) | 2/2 (100%) |
| `pdf_tiny_font` | pdf | 3/4 (75%) | 3/3 (100%) | 0/1 (0%) | 4/4 (100%) |
| `tiny_font` | html | 3/5 (60%) | 3/3 (100%) | 0/2 (0%) | 5/5 (100%) |
| `transparent` | html | 2/4 (50%) | 2/2 (100%) | 0/2 (0%) | 4/4 (100%) |
| `unicode_tags` | html, pdf | 4/4 (100%) | 3/3 (100%) | 1/1 (100%) | 4/4 (100%) |
| `variation_selectors` | html | 1/1 (100%) | 1/1 (100%) | n/a | 1/1 (100%) |
| `zero_width` | html, pdf | 2/2 (100%) | 2/2 (100%) | n/a | 2/2 (100%) |

## Misses and false alarms (24)

| File | Outcome | Payload | Expected | Found, unflagged | Max aiScore |
|---|---|---|---|---|---|
| `pdf_pdf_invisible__chrome_white_text__subtle` | FN | subtle | pdf_invisible | pdf_invisible | 0.41 |
| `pdf_pdf_invisible__covered_by_white_rect__subtle` | FN | subtle | pdf_invisible | pdf_invisible | 0.00 |
| `pdf_pdf_invisible__near_white_text__subtle` | FN | subtle | pdf_invisible | pdf_invisible | 0.35 |
| `pdf_pdf_invisible__render_mode_3__subtle` | FN | subtle | pdf_invisible | pdf_invisible | 0.35 |
| `pdf_pdf_offpage__below_page__subtle` | FN | subtle | pdf_offpage | pdf_offpage | 0.00 |
| `pdf_pdf_tiny_font__1pt__subtle` | FN | subtle | pdf_tiny_font | pdf_tiny_font | 0.41 |
| `web_attr_text__alt__subtle` | FN | subtle | attr_text | – | 0.00 |
| `web_attr_text__aria_label__subtle` | FN | subtle | attr_text | – | 0.00 |
| `web_clipped__clip_path__subtle` | FN | subtle | clipped | clipped | 0.41 |
| `web_clipped__scale0__subtle` | FN | subtle | clipped | clipped | 0.00 |
| `web_clipped__sr_only_abuse__subtle` | FN | subtle | clipped | – | 0.00 |
| `web_clipped__zero_box__subtle` | FN | subtle | clipped | clipped | 0.35 |
| `web_display_none__display__subtle` | FN | subtle | display_none | display_none | 0.35 |
| `web_display_none__visibility__subtle` | FN | subtle | display_none | display_none | 0.00 |
| `web_html_comment__comment__subtle` | FN | subtle | html_comment | – | 0.00 |
| `web_low_contrast__dark_on_dark__subtle` | FN | subtle | low_contrast | low_contrast | 0.00 |
| `web_low_contrast__near_white__subtle` | FN | subtle | low_contrast | low_contrast | 0.35 |
| `web_low_contrast__white__subtle` | FN | subtle | low_contrast | low_contrast | 0.00 |
| `web_offscreen__left__subtle` | FN | subtle | offscreen | offscreen | 0.41 |
| `web_offscreen__text_indent__subtle` | FN | subtle | offscreen | offscreen | 0.00 |
| `web_tiny_font__1px__subtle` | FN | subtle | tiny_font | tiny_font | 0.41 |
| `web_tiny_font__zero__subtle` | FN | subtle | tiny_font | tiny_font | 0.00 |
| `web_transparent__opacity__subtle` | FN | subtle | transparent | transparent | 0.35 |
| `web_transparent__rgba__subtle` | FN | subtle | transparent | transparent | 0.00 |

Timings: median of 3 scans per file, measured inside the page around the scan call (no page load), on the machine that ran the eval.
