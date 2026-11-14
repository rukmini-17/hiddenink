// Turn invisible runs back into the text an AI would "see".

import { UNICODE_LIMITS } from "./limits";

const utf8 = new TextDecoder("utf-8");

/** Tags U+E0020–E007E mirror printable ASCII. Language tag (E0001) and cancel (E007F) are dropped. */
export function decodeTags(cps: number[]): string {
  return cps
    .filter((cp) => cp >= 0xe0020 && cp <= 0xe007e)
    .map((cp) => String.fromCharCode(cp - 0xe0000))
    .join("");
}

/** "Emoji smuggling": VS1–16 encode bytes 0–15, VS17–256 encode bytes 16–255. */
export function decodeVariationSelectors(cps: number[]): string {
  const bytes = cps.map((cp) => (cp <= 0xfe0f ? cp - 0xfe00 : cp - 0xe0100 + 16));
  return utf8.decode(new Uint8Array(bytes));
}

/**
 * Common zero-width steganography: two zero-width chars stand for 0 and 1, 8 per byte.
 * Tries both bit assignments; returns undefined if neither yields readable text.
 */
export function decodeZeroWidthBinary(cps: number[]): string | undefined {
  const symbols = [...new Set(cps)].sort((a, b) => a - b);
  if (symbols.length !== 2 || cps.length % 8 !== 0) return undefined;
  for (const one of symbols) {
    const bytes: number[] = [];
    for (let i = 0; i < cps.length; i += 8) {
      let byte = 0;
      for (let b = 0; b < 8; b++) byte = (byte << 1) | (cps[i + b] === one ? 1 : 0);
      bytes.push(byte);
    }
    const text = utf8.decode(new Uint8Array(bytes));
    if (isReadable(text)) return text;
  }
  return undefined;
}

/** Long enough, contains a word-like pair of letters, and is ≥90% normal printable chars. */
export function isReadable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < UNICODE_LIMITS.minReadableLength) return false;
  if (!/\p{L}{2}/u.test(trimmed)) return false;
  const chars = [...trimmed];
  const printable = chars.filter((c) => /[\p{L}\p{N}\p{P}\p{S}\p{Zs}]/u.test(c)).length;
  return printable / chars.length >= 0.9;
}
