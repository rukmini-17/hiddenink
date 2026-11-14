// A tiny hand-rolled PDF writer for tests (no dependencies, works in Node and the browser).
// It gives exact control over the tricks we test: text color, size, render mode 3 (invisible),
// shapes drawn over text, raw RGB images (fake scans), and a ToUnicode map that makes
// extracted text come out as Unicode tag characters.
//
// Coordinates are PDF user space: points, origin at the BOTTOM-left (unlike our findings).

export type RGB = [number, number, number]; // 0–1

export type TextOpts = {
  size?: number;
  color?: RGB;
  /** 0 = fill (normal), 3 = invisible. */
  mode?: number;
  /**
   * "tags": extracted text maps byte 0x20–0x7E to U+E0020–E007E (Unicode tag characters).
   * "missing-glyphs": ASCII extracts normally, except "~", "}" and "|", whose ToUnicode entries point at
   * the control characters U+0000, U+0007 and U+001B. That's what embedded subset fonts produce for
   * glyphs they can't map (e.g. reportlab + a TTF without the character): the glyph exists, its
   * Unicode is NUL. (Codes with no glyph at all don't reproduce it: pdf.js turns those into spaces.)
   */
  font?: "helvetica" | "tags" | "missing-glyphs";
};

const FONT_RESOURCE = { helvetica: "F1", tags: "FT", "missing-glyphs": "FN" } as const;

export const text = (x: number, y: number, str: string, o: TextOpts = {}) => {
  const [r, g, b] = o.color ?? [0, 0, 0];
  const font = FONT_RESOURCE[o.font ?? "helvetica"];
  const escaped = str.replace(/[\\()]/g, (c) => `\\${c}`);
  return `BT /${font} ${o.size ?? 12} Tf ${r} ${g} ${b} rg ${o.mode ?? 0} Tr ${x} ${y} Td (${escaped}) Tj ET`;
};

export const rect = (x: number, y: number, w: number, h: number, color: RGB = [1, 1, 1]) =>
  `q ${color.join(" ")} rg ${x} ${y} ${w} ${h} re f Q`;

/** Draw image `name` (declared in the page's `images`) stretched over x, y, w, h. */
export const image = (name: string, x: number, y: number, w: number, h: number) =>
  `q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`;

export type RawImage = { width: number; height: number; rgb: Uint8Array };
export type PageSpec = { width?: number; height?: number; content: string[]; images?: Record<string, RawImage> };

/** A ToUnicode CMap: `mappings` is the bfrange/bfchar section. */
const toUnicodeCmap = (name: string, mappings: string) => `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /${name} def
/CMapType 2 def
1 begincodespacerange
<00> <FF>
endcodespacerange
${mappings}
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;

const TAG_CMAP = toUnicodeCmap("HiddenInkTags", "1 beginbfrange\n<20> <7E> <DB40DC20>\nendbfrange");
const MISSING_GLYPHS_CMAP = toUnicodeCmap(
  "HiddenInkMissingGlyphs",
  "1 beginbfrange\n<20> <7B> <0020>\nendbfrange\n3 beginbfchar\n<7C> <001B>\n<7D> <0007>\n<7E> <0000>\nendbfchar",
);

/** Build a complete PDF file. Default page size is US Letter (612 × 792 pt). */
export function makePdf(pages: PageSpec[]): Uint8Array {
  const objects: (string | Uint8Array)[][] = []; // each object = chunks (text or binary)
  const add = (...chunks: (string | Uint8Array)[]) => objects.push(chunks) as number; // returns new id
  const stream = (dict: string, body: string | Uint8Array) => {
    const len = typeof body === "string" ? latin1(body).length : body.length;
    return add(`<< ${dict} /Length ${len} >>\nstream\n`, body, "\nendstream");
  };

  const catalog = add(""); // placeholders, filled once we know the Pages id
  const pagesId = add("");
  const helvetica = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const cmap = stream("", TAG_CMAP);
  const tagFont = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode ${cmap} 0 R >>`);
  const nulCmap = stream("", MISSING_GLYPHS_CMAP);
  const nulFont = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode ${nulCmap} 0 R >>`);

  const pageIds = pages.map((p) => {
    const xobjects = Object.entries(p.images ?? {}).map(([name, img]) => {
      const id = stream(
        `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8`,
        img.rgb,
      );
      return `/${name} ${id} 0 R`;
    });
    const contents = stream("", p.content.join("\n"));
    return add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${p.width ?? 612} ${p.height ?? 792}] ` +
        `/Resources << /Font << /F1 ${helvetica} 0 R /FT ${tagFont} 0 R /FN ${nulFont} 0 R >> /XObject << ${xobjects.join(" ")} >> >> ` +
        `/Contents ${contents} 0 R >>`,
    );
  });
  objects[catalog - 1] = [`<< /Type /Catalog /Pages ${pagesId} 0 R >>`];
  objects[pagesId - 1] = [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`];

  // Serialize with a correct cross-reference table (byte offsets of each object).
  const out: Uint8Array[] = [latin1("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  let offset = out[0].length;
  const offsets: number[] = [];
  objects.forEach((chunks, i) => {
    offsets.push(offset);
    for (const c of [`${i + 1} 0 obj\n`, ...chunks, "\nendobj\n"]) {
      const bytes = typeof c === "string" ? latin1(c) : c;
      out.push(bytes);
      offset += bytes.length;
    }
  });
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  out.push(latin1(xref));
  return concat(out);
}

const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

function concat(parts: Uint8Array[]): Uint8Array {
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.length;
  }
  return all;
}

/** Copy into a standalone ArrayBuffer (what scanPdf takes). */
export const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
