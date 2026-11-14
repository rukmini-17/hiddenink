// Code-point classes for invisible Unicode tricks.

/** String.fromCodePoint(...cps) without blowing the call stack on long texts. */
export function fromCodePoints(cps: number[]): string {
  const CHUNK = 8192;
  let out = "";
  for (let i = 0; i < cps.length; i += CHUNK) out += String.fromCodePoint(...cps.slice(i, i + CHUNK));
  return out;
}

/**
 * Control characters that never belong in clean text: C0 (except tab and newline), DEL, C1.
 * PDFs produce them (subset fonts extract unmappable glyphs as U+0000), and terminals/apps leak
 * ESC/BEL. Line-break controls (CR, FF, VT, NEL) are turned into "\n" before this check.
 */
export const isControl = (cp: number) =>
  (cp <= 0x1f && cp !== 0x09 && cp !== 0x0a) || (cp >= 0x7f && cp <= 0x9f);

/** U+E0000–U+E007F: "tag" characters. Invisible, but each maps 1:1 to an ASCII char. */
export const isTag = (cp: number) => cp >= 0xe0000 && cp <= 0xe007f;
export const TAG_CANCEL = 0xe007f;
export const BLACK_FLAG = 0x1f3f4;

/** Tag letters/digits: the only tags allowed inside a subdivision flag (e.g. "gbeng"). */
export const isFlagTag = (cp: number) =>
  (cp >= 0xe0030 && cp <= 0xe0039) || (cp >= 0xe0061 && cp <= 0xe007a);

/** Zero-width space, non-joiner, joiner, word joiner, BOM/zero-width no-break space. */
export const isZeroWidth = (cp: number) =>
  (cp >= 0x200b && cp <= 0x200d) || cp === 0x2060 || cp === 0xfeff;
export const ZWNJ = 0x200c;
export const ZWJ = 0x200d;
export const BOM = 0xfeff;

/** Embeddings/overrides (U+202A–202E) and isolates (U+2066–2069). */
export const isBidi = (cp: number) => (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069);
/** Overrides force display order; they're the Trojan-Source / "fdp.exe" trick. */
export const isBidiOverride = (cp: number) => cp === 0x202d || cp === 0x202e;

/** Variation selectors VS1–16 and the supplement VS17–256. */
export const isVariationSelector = (cp: number) =>
  (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);

/** Emoji modifiers (skin tones) can sit between an emoji and a ZWJ. */
const isEmojiModifier = (cp: number) => cp >= 0x1f3fb && cp <= 0x1f3ff;

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const LETTER_OR_MARK = /[\p{L}\p{M}]/u;
const LATIN = /\p{Script=Latin}/u;

/** True if cp can be part of an emoji that a ZWJ legitimately glues together. */
export const isEmojiPart = (cp: number | undefined) =>
  cp !== undefined &&
  (PICTOGRAPHIC.test(String.fromCodePoint(cp)) || isEmojiModifier(cp) || isVariationSelector(cp));

/**
 * ZWJ/ZWNJ have real jobs in scripts like Persian, Arabic and Devanagari.
 * We only excuse them between non-Latin letters; between Latin letters they're suspicious.
 */
export const isNonLatinLetter = (cp: number | undefined) => {
  if (cp === undefined) return false;
  const ch = String.fromCodePoint(cp);
  return LETTER_OR_MARK.test(ch) && !LATIN.test(ch);
};
