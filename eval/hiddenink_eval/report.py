"""Write the eval results: per-file CSV, full JSON, and a short markdown summary for slides."""

import csv
import json
from dataclasses import asdict
from pathlib import Path

from .metrics import FileResult, Rate, detection, false_positives, misses, per_technique, timing

CAVEAT = ("Corpus is team-written (81 synthetic files), so these numbers describe this corpus, "
          "not the open web. See docs/EVAL.md.")


def compute(rows: list[FileResult]) -> dict:
    return {
        "detection": detection(rows),
        "per_technique": per_technique(rows),
        "false_positives": false_positives(rows),
        "timing": timing(rows),
    }


def write_all(rows: list[FileResult], meta: dict, out: Path, suffix: str) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    metrics = compute(rows)
    paths = [out / f"metrics_{suffix}.csv", out / f"results_{suffix}.json", out / f"summary_{suffix}.md"]
    write_csv(rows, paths[0])
    write_json(rows, metrics, meta, paths[1])
    paths[2].write_text(summary_markdown(rows, metrics, meta), encoding="utf-8")
    return paths


def write_csv(rows: list[FileResult], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "type", "label", "payload_kind", "expected_techniques", "flagged_techniques",
                    "unflagged_techniques", "max_ai_score", "outcome", "detected_strict", "found", "scan_ms", "error"])
        for r in sorted(rows, key=lambda r: r.id):
            w.writerow([r.id, r.type, r.label, r.payload_kind, ";".join(r.expected), ";".join(r.flagged_techniques),
                        ";".join(r.unflagged_techniques), r.max_ai_score, r.outcome,
                        r.detected_strict if r.label == "attack" else "", r.found if r.expected else "",
                        r.scan_ms, r.error or ""])


def _jsonable(x):
    if isinstance(x, Rate):
        return x.as_dict()
    if isinstance(x, dict):
        return {k: _jsonable(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_jsonable(v) for v in x]
    return x


def write_json(rows: list[FileResult], metrics: dict, meta: dict, path: Path) -> None:
    data = {
        "meta": meta,
        "metrics": _jsonable(metrics),
        "files": [{**asdict(r), "outcome": r.outcome, "detected_strict": r.detected_strict, "found": r.found}
                  for r in sorted(rows, key=lambda r: r.id)],
    }
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def summary_markdown(rows: list[FileResult], m: dict, meta: dict) -> str:
    d, fp, t = m["detection"], m["false_positives"], m["timing"]
    counts = meta["corpus_counts"]
    lines = [
        f"# HiddenInk eval: {meta['layer_title']}",
        "",
        f"_{meta['corpus_files']} files ({counts.get('attack', 0)} attack, {counts.get('benign', 0)} benign, "
        f"{counts.get('hidden_benign', 0)} hidden-benign) · commit `{meta['git_commit']}` · "
        f"Chrome {meta['chrome_version']} · {meta['date']}_",
        "",
        f"> {CAVEAT}",
        "",
        "## Headline",
        "",
        "| Metric | Result |",
        "|---|---|",
        f"| **Attacks detected** (any flagged finding) | **{d['overall']['detected']}** |",
        f"| Attacks detected with the right technique flagged | {d['overall']['detected_strict']} |",
        f"| Obvious payloads detected | {d['obvious']['detected']} |",
        f"| **Subtle payloads detected** | **{d['subtle']['detected']}** |",
        f"| Hidden text found (flagged or not) | {d['overall']['found']} |",
        f"| **False positives: benign files** | **{fp['benign']}** |",
        f"| False positives: hidden-benign (keyword stuffing) | {fp['hidden_benign']} "
        f"(still reported, unflagged: {fp['hidden_benign_reported']}) |",
    ]
    for kind in ("html", "pdf"):
        if kind in t:
            lines.append(f"| Scan time per {kind.upper()} file, median / worst | "
                         f"{_ms(t[kind]['median_ms'])} / {_ms(t[kind]['max_ms'])} |")
    if meta.get("pdf_cold_start_ms") is not None:
        lines.append(f"| First PDF scan (cold start) | {_ms(meta['pdf_cold_start_ms'])} |")
    errors = [r for r in rows if r.error]
    if errors:
        lines.append(f"| Files that failed to scan | {len(errors)} |")

    lines += ["", "## Per technique", "",
              "| Technique | Where | Flagged | Obvious | Subtle | Found (flagged or not) |",
              "|---|---|---|---|---|---|"]
    for tech, s in m["per_technique"].items():
        lines.append(f"| `{tech}` | {', '.join(s['types'])} | {s['flagged']} | {s['flagged_obvious']} | "
                     f"{s['flagged_subtle']} | {s['found']} |")

    bad = misses(rows)
    lines += ["", f"## Misses and false alarms ({len(bad)})", ""]
    if bad:
        lines += ["| File | Outcome | Payload | Expected | Found, unflagged | Max aiScore |", "|---|---|---|---|---|---|"]
        for r in sorted(bad, key=lambda r: (r.outcome, r.payload_kind, r.id)):
            lines.append(f"| `{r.id}` | {r.outcome} | {r.payload_kind} | {', '.join(r.expected) or '–'} | "
                         f"{', '.join(r.unflagged_techniques) or '–'} | {r.max_ai_score:.2f} |")
    else:
        lines.append("None.")
    lines += ["", f"Timings: median of {meta['repeat']} scans per file, measured inside the page around the scan "
              "call (no page load), on the machine that ran the eval.", ""]
    return "\n".join(lines)


def _ms(v: float) -> str:
    return f"{v:.0f} ms" if v >= 10 else f"{v:.1f} ms"
