import { describe, expect, it } from "vitest";
import { cleanText, scanText } from "../src/index";

// Smoke test of the public API shape. scanDocument needs real layout, so it's tested
// in test/browser/; scanPdf is tested in test/pdf/ (Node) and test/browser/.
describe("public API", () => {
  it("scanText on clean text returns it unchanged with no findings", () => {
    expect(scanText("hello")).toEqual({ findings: [], visibleText: "hello" });
  });

  it("cleanText leaves clean text alone", () => {
    expect(cleanText("abc")).toBe("abc");
  });
});
