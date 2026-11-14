export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** The "Upload clean text instead" file: what a human would see, as plain text. */
export function cleanTextFile(originalName: string, visibleText: string): File {
  const base = originalName.replace(/\.pdf$/i, "");
  return new File([visibleText], `${base}.clean.txt`, { type: "text/plain" });
}
