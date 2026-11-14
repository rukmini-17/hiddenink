import { describe, expect, it } from "vitest";
import { cleanText, scanPdf, scanText } from "../src/index";

// Smoke test of the public API shape. scanDocument needs real layout, so it's tested
// in test/browser/ instead (jsdom has no getBoundingClientRect on ranges).
describe("public API", () => {
  it("scanText on clean text returns it unchanged with no findings", () => {
    expect(scanText("hello")).toEqual({ findings: [], visibleText: "hello" });
  });

  it("scanPdf resolves to a ScanResult (stub until R4)", async () => {
    expect((await scanPdf(new ArrayBuffer(0))).findings).toEqual([]);
  });

  it("cleanText leaves clean text alone", () => {
    expect(cleanText("abc")).toBe("abc");
  });
});
