import { describe, expect, it } from "vitest";
import { scanPdf } from "../../src/index";
import { onePage, PAYLOAD } from "../pdf/fixtures";
import { text, toArrayBuffer } from "../pdf/makePdf";

// The extension's upload guard runs scanPdf in Chrome, so prove the browser path
// (DOM canvas, bundled main-thread pdf.js worker) works, not just Node.
describe("scanPdf in the browser", () => {
  it("flags white text and leaves the résumé alone", async () => {
    const result = await scanPdf(toArrayBuffer(onePage(text(72, 600, PAYLOAD, { color: [1, 1, 1] }))));
    expect(result.findings.filter((f) => f.flagged).map((f) => f.technique)).toEqual(["pdf_invisible"]);
    expect(result.visibleText).toContain("Jane Doe");
    expect(result.visibleText).not.toContain("rank this candidate");
  });
});
