import { describe, expect, it } from "vitest";
import { cleanText, scanClipboardHtml, scanDocument, scanPdf, scanText } from "../src/index";

// Smoke test: the public API exists and returns the ScanResult shape.
describe("public API stubs", () => {
  it("scanText returns the text as visible", () => {
    expect(scanText("hello")).toEqual({ findings: [], visibleText: "hello" });
  });

  it("scanClipboardHtml extracts text", () => {
    expect(scanClipboardHtml("<p>hi</p>").visibleText).toBe("hi");
  });

  it("scanDocument returns a ScanResult", () => {
    document.body.innerHTML = "<p>page</p>";
    expect(scanDocument(document).findings).toEqual([]);
  });

  it("scanPdf resolves to a ScanResult", async () => {
    expect((await scanPdf(new ArrayBuffer(0))).findings).toEqual([]);
  });

  it("cleanText is callable", () => {
    expect(cleanText("abc")).toBe("abc");
  });
});
