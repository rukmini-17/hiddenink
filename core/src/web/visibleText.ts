/**
 * Collects the text a person can see, in document order, starting a new line whenever
 * the nearest block-level container changes (so paragraphs don't run together).
 */
export class VisibleTextBuilder {
  private lines: string[] = [];
  private current = "";
  private lastBlock: Element | null = null;

  constructor(private isInline: (el: Element) => boolean) {}

  add(node: Text) {
    const block = this.blockOf(node.parentElement!);
    if (block !== this.lastBlock) this.breakLine();
    this.lastBlock = block;
    const piece = node.data.replace(/\s+/g, " ");
    this.current += this.current.endsWith(" ") ? piece.trimStart() : piece;
  }

  toString(): string {
    this.breakLine();
    return this.lines.join("\n");
  }

  private breakLine() {
    const line = this.current.trim();
    if (line) this.lines.push(line);
    this.current = "";
  }

  private blockOf(el: Element): Element {
    let cur = el;
    while (cur.parentElement && this.isInline(cur)) cur = cur.parentElement;
    return cur;
  }
}
