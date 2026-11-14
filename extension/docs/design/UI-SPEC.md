# HiddenInk UI spec (final mockup, teal 2A)

Reference images (in this folder): 01-normal-page.png, 02-xray-teal.png, 03-upload-dialog.png, 04-paste-dialog.png, 05-icons.png.
The images show the look. This file has the exact values. If they disagree, ask.

## X-ray mode
- Page is dimmed and recoloured, never edited. Benign text stays readable but muted. Nothing is highlighted, tagged or boxed.
- Technique: a fixed, full-screen, pointer-events:none layer with
  `backdrop-filter: invert(.93) hue-rotate(180deg) brightness(.5)`.
  It affects only what is behind it. Do NOT put the revealed text inside it.
- Revealed hidden text lives in a SEPARATE layer above it: an absolutely positioned container at the document's top-left, scrolling with the page. For each flagged finding, draw `finding.text` (or `decoded`) at `location.bbox` (web bbox = page CSS px, document top-left). The real hidden text is invisible under the dim layer, so we draw a copy.
- Revealed text style: Inter/system font 15px, weight 500, colour #5FE6D4, `text-shadow: 0 0 10px rgba(95,230,212,.65)`, no background, no border, no label.
- Hovered or clicked line: colour #BFFFF4, background rgba(95,230,212,.14), `text-shadow: 0 0 12px rgba(95,230,212,.9), 0 0 28px rgba(95,230,212,.5)`.
- Fallback if backdrop-filter misbehaves on a site: dark overlay rgba(8,12,22,.7) and accept less readable page text.
- No side panel opens when X-ray turns on. Remove the duplicate hover popup.

## Click card (opens at the side of the clicked line)
- Looks like a Chrome/Material dialog, dark: background #1F1F1F, 1px #3C4043 border, radius 16px, shadow 0 8px 32px rgba(0,0,0,.6), width 380px, padding 20px, font Roboto/system-ui 14px/20px, text #E3E3E3, secondary #C4C7C5.
- Header: HiddenInk icon (18px) + "HiddenInk" 12px #9AA0A6.
- Title (20px): "There is hidden text here".
- Body: "This text can't be seen on the page, but an AI assistant reading it would see it."
- Quote block: background #2B2B2B, radius 8px, padding 10px 12px, 13px.
- Cause line: "Hidden as white text on a white background." (adapt per technique: tiny text, off-screen, invisible Unicode, hidden comment, etc.)
- Likelihood: "Looks like an instruction to an AI" + badge High (#601410 bg, #F9DEDC text) / Medium (#4A3B00 bg, #FFE08A text). No percentages.
- Buttons, right-aligned: "Copy text" (text button, #A8C7FA) and "View all N" (filled pill, #A8C7FA bg, #062E6F text). Height 36px, radius 18px.
- No uppercase mono labels anywhere. System font only.

## Top bar while X-ray is on
Small dialog-style pill, top centre: icon, "X-ray on", "N hidden items", "View all", close X. Same dark dialog colours.

## Paste guard and upload guard (Chrome-style dialogs)
- Centred Material dialog, scrim rgba(32,33,36,.38) light / rgba(0,0,0,.52) dark, follows the page's light or dark scheme.
- Radius 16px, padding 24px, title 22px/28px, body 14px/20px, pill buttons 40px high.
- Upload guard buttons: "Upload anyway", "Cancel" (text) and "Upload clean text instead" (filled). Shows a small page preview with the hidden line highlighted.
- Paste guard buttons: "Show me", "Paste anyway" (text), "Paste clean" (filled). Lists each finding with a High/Medium badge.
- Keep the HiddenInk icon and name on every dialog so a page can't spoof them. Never use alert/confirm.

## Theme
Replace the orange theme everywhere. Palette: near-black #0B1226, teal #5FE6D4, pale teal #BFFFF4, violet #8B7CFF for small accents, dialog neutrals above.

## Icon
Chosen: C, the eye inside a shield, in the LIGHT version (light tile, dark navy lines, violet pupil). See 05-icons.png (the "Light tile" row, C Shield) and use this SVG as the source:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <rect width="28" height="28" rx="7" fill="#EEF2FF"/>
  <rect x=".5" y=".5" width="27" height="27" rx="6.5" fill="none" stroke="#C7D2FE"/>
  <path d="M14 4l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V7z" fill="none" stroke="#1B2A4A" stroke-width="1.7" stroke-linejoin="round"/>
  <circle cx="14" cy="13.5" r="2.6" fill="#6D5BF0"/>
  <path d="M9.5 13.5c1.2-1.8 2.7-2.7 4.5-2.7s3.3.9 4.5 2.7" fill="none" stroke="#1B2A4A" stroke-width="1.3"/>
</svg>
```

- Export as PNG at 16, 32, 48 and 128 px for the extension icon and toolbar.
- Glyph-only variant (same SVG without the two `rect` lines) for small sizes where the tile gets muddy, such as 16 px.
- Use the same icon in the dialog headers, the top bar and the Inky/popup header. On dark dialogs, keep the light tile so the icon stays recognisable.
- Update the earlier mentions of the dark eye icon in the mockups to this one.

## Realistic demo page
Job posting styled like an ATS page (Greenhouse-like layout, fictional company "Northwind Labs"), "Machine Learning Engineer, Early Career". See 01-normal-page.png. Hidden lines sit between normal paragraphs and take one normal line of height, so the layout never has big gaps.
