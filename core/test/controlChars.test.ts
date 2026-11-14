import { describe, expect, it } from "vitest";
import { cleanText, scanText } from "../src/index";

// "Clean" text (Paste clean, Upload clean text, safe_read) must never carry control characters:
// PDFs with subset fonts extract missing glyphs as U+0000, and some sources leak ESC/BEL/DEL.
// Only newline and tab survive; other line breaks become "\n".

/** Any C0 control except \t and \n, DEL, or any C1 control. */
export const FORBIDDEN_CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;

const allControls = (): string[] => {
  const out: string[] = [];
  for (let cp = 0; cp <= 0x9f; cp++) if (cp < 0x20 || cp >= 0x7f) out.push(String.fromCharCode(cp));
  return out;
};

describe("cleanText strips control characters", () => {
  it("removes NUL characters left by missing glyphs", () => {
    expect(cleanText("engineer.\u0000\u0000\u0000 Five years")).toBe("engineer. Five years");
  });

  it.each(allControls().map((c) => [`U+${c.charCodeAt(0).toString(16).padStart(4, "0")}`, c]))(
    "never outputs %s as a forbidden control character",
    (_name, c) => {
      expect(cleanText(`a${c}b`)).not.toMatch(FORBIDDEN_CONTROL);
    },
  );

  it("keeps newline and tab", () => {
    expect(cleanText("name:\tAvery\nrole:\tEngineer")).toBe("name:\tAvery\nrole:\tEngineer");
  });

  it("turns CRLF, CR, form feed and vertical tab into newlines", () => {
    expect(cleanText("one\r\ntwo\rthree\ffour\u000Bfive")).toBe("one\ntwo\nthree\nfour\nfive");
  });

  it("turns Unicode line/paragraph separators and NEL into newlines", () => {
    expect(cleanText("a b c\u0085d")).toBe("a\nb\nc\nd");
  });

  it("removes DEL, ESC and C1 controls without touching normal accented text", () => {
    expect(cleanText("Café\u007F \u001B[31mrésumé\u0090")).toBe("Café [31mrésumé");
  });

  it("still keeps legitimate flag emoji and emoji ZWJ sequences", () => {
    const wales = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}";
    const family = "👨‍👩‍👧";
    expect(cleanText(`${wales}\u0000 ${family}`)).toBe(`${wales} ${family}`);
  });
});

describe("scanText", () => {
  it("visibleText has no control characters", () => {
    expect(scanText("Hi\u0000 there\u0007\r\n").visibleText).not.toMatch(FORBIDDEN_CONTROL);
  });

  it("does not report control characters as hidden-text findings", () => {
    // They're junk, not an attack technique in our contract; we just clean them.
    expect(scanText("a\u0000b\u0007c").findings).toEqual([]);
  });
});
