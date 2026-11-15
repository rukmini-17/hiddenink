/** Smoke test for the R2 server. Requires:
 *   - the server running on :8787  (pnpm --filter @hiddenink/server start)
 *   - the docs site on :8791       (cd demo/site && python3 -m http.server 8791)
 * Usage: HIDDENINK_API_KEY=... node server/scripts/smoke.mjs [pageUrl]
 */
const BASE = process.env.HIDDENINK_API_URL ?? "http://localhost:8787";
const KEY = process.env.HIDDENINK_API_KEY ?? "";
const PAGE = process.argv[2] ?? "http://localhost:8791/quickstart.html";
const auth = KEY ? { Authorization: `Bearer ${KEY}` } : {};

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

const health = await fetch(`${BASE}/health`).then((r) => r.json());
check("GET /health ok", health.ok === true);

const res = await fetch(`${BASE}/api/safe-fetch`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth },
  body: JSON.stringify({ url: PAGE }),
});
check("POST /api/safe-fetch 200", res.ok, `status ${res.status}`);
const data = await res.json();

check("has findings", Array.isArray(data.findings) && data.findings.length >= 1,
  `${data.findings?.length ?? 0} finding(s)`);
check("has warning", typeof data.warning === "string" && data.warning.length > 0,
  JSON.stringify(data.warning));
check("visibleText hides the payload",
  typeof data.visibleText === "string" && !/vectorbase[-_]auth/i.test(data.visibleText));
check("manifest stub present",
  data.manifest && Array.isArray(data.manifest.packages) && Array.isArray(data.manifest.commands));

console.log(`\nremovedCount=${data.removedCount}  techniques=${(data.findings ?? []).map((f) => f.technique).join(",")}`);
process.exit(failures ? 1 : 0);
