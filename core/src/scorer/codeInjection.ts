// Hidden text that carries an install command or an import statement is dangerous on its
// own, regardless of the AI-aimed score: a coding agent that reads it may run it. This is
// the "supply-chain via hidden docs" case (a hidden `pip install …` or `import …`).

const INSTALL =
  /\b(pip3?|pipx|uv|conda|npm|pnpm|yarn|bun|gem|cargo|poetry|apt|apt-get|brew)\s+(install|add|i)\b/i;

// Code-specific import forms, line-anchored so ordinary prose ("import your contacts")
// doesn't match: a bare `import module` on its own line, `from module import …`, or
// a `require("module")` call.
const IMPORT =
  /(^|\n)\s*import\s+[A-Za-z_][\w.]*\s*;?\s*(\n|$)|(^|\n)\s*from\s+[A-Za-z_][\w.]*\s+import\b|require\(\s*['"][^'"]+['"]\s*\)/;

export const CODE_INJECTION_REASON =
  "contains a package install command or import statement";

/** True if the text looks like an install command or an import — a code-execution payload. */
export function looksLikeCodeInjection(text: string): boolean {
  return INSTALL.test(text) || IMPORT.test(text);
}
