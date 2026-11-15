/** Layer 2, part 2: deterministic action check (NO AI in the decision).
 *  Compares the packages an action would install against the recent safe-fetch manifests.
 *  Anything not justified by the docs is blocked. Gemini is used only for an optional
 *  after-the-fact incident report. */
import { geminiEnabled, generateText } from "./gemini.js";
import { recentManifests } from "./manifestCache.js";

export type CheckRequest = { tool: string; input: Record<string, unknown> };
export type CheckResult = { allow: boolean; reason: string; incident?: string };

/** PEP 503 / npm-ish name normalization for comparison. */
export function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, "-");
}

/** Strip a version/extras/tag so "vectorbase-auth==1.0", "vectorbase-auth[all]", "pkg@1" -> name. */
function bareName(token: string): string {
  return token
    .replace(/\[.*?\]/g, "")
    .split(/[<>=!~ ]/)[0]
    .replace(/@[^/].*$/, "") // npm pkg@version (but keep @scope/name)
    .trim();
}

function fromCommand(cmd: string): string[] {
  const m = cmd.match(/\b(pip3?|pipx|uv|conda|npm|pnpm|yarn|bun|poetry)\s+(install|add|i)\b(.*)$/is);
  if (!m) return [];
  const pkgs: string[] = [];
  const toks = m[3].split(/\s+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.startsWith("-")) {
      if (t === "-r" || t === "--requirement" || t === "-e") i++; // skip its argument
      continue;
    }
    const name = bareName(t);
    if (name && !/^(install|add|i)$/i.test(name)) pkgs.push(name);
  }
  return pkgs;
}

function fromRequirements(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, "").trim())
    .filter((l) => l && !l.startsWith("-"))
    .map(bareName)
    .filter(Boolean);
}

function fromPackageJson(content: string): string[] {
  try {
    const json = JSON.parse(content);
    return [
      ...Object.keys(json.dependencies ?? {}),
      ...Object.keys(json.devDependencies ?? {}),
    ];
  } catch {
    // Partial edit: fall back to "name": "version" pairs.
    return [...content.matchAll(/"([^"]+)"\s*:\s*"[^"]*"/g)].map((mm) => mm[1]);
  }
}

const isReq = (p: string) => /requirements[\w.-]*\.txt$/i.test(p);
const isPkgJson = (p: string) => /(^|\/)package\.json$/i.test(p);

/** Packages an action would add, if any. */
export function extractPackages(req: CheckRequest): string[] {
  const i = req.input ?? {};
  if (req.tool === "Bash") return fromCommand(String(i.command ?? ""));
  if (req.tool === "Write") {
    const p = String(i.file_path ?? "");
    const c = String(i.content ?? "");
    if (isReq(p)) return fromRequirements(c);
    if (isPkgJson(p)) return fromPackageJson(c);
  }
  if (req.tool === "Edit") {
    const p = String(i.file_path ?? "");
    const c = String(i.new_string ?? "");
    if (isReq(p)) return fromRequirements(c);
    if (isPkgJson(p)) return fromPackageJson(c);
  }
  return [];
}

export async function checkAction(req: CheckRequest, opts: { incident?: boolean } = {}): Promise<CheckResult> {
  const pkgs = extractPackages(req);
  if (pkgs.length === 0) return { allow: true, reason: "No package install or dependency change detected." };

  const manifests = recentManifests();
  if (manifests.length === 0) {
    // No docs have been safe-fetched, so there is nothing to check against: fail open.
    return { allow: true, reason: "No documentation context to check against (allowed)." };
  }

  const allowed = new Set(manifests.flatMap((m) => m.packages.map(normalize)));
  const offending = pkgs.filter((p) => !allowed.has(normalize(p)));
  if (offending.length === 0) {
    return { allow: true, reason: "All packages are in the documentation's expected set." };
  }

  const expected = [...allowed].join(", ") || "none";
  const list = offending.join(", ");
  const verb = offending.length > 1 ? "are" : "is";
  const reason =
    `Blocked: ${list} ${verb} not in the packages this page's documentation told you to ` +
    `install (expected: ${expected}). A hidden instruction may have added ${offending.length > 1 ? "them" : "it"}.`;

  let incident: string | undefined;
  if (opts.incident !== false && geminiEnabled()) {
    try {
      incident = await generateText(
        "Write a 3-sentence plain-language security incident note for a developer. Be factual and calm.",
        `A coding agent tried to ${req.tool === "Bash" ? "run" : "write"} an action that would install ` +
          `the package(s): ${list}. The documentation it was following only justified: ${expected}. ` +
          `These extra package(s) were not in the visible docs and were blocked.`,
      );
    } catch {
      /* incident report is best-effort */
    }
  }
  return { allow: false, reason, incident };
}
