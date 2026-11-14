"""Local eval: the rules-only baseline (core engine, no Stage 2 layers).

    pnpm eval                                   # from the repo root: builds core, then runs this
    cd eval && uv run run_local.py [--repeat 3] [--only <id substring>]

Writes eval/results/{metrics,results,summary}_local.* and prints the headline numbers.
With --only, results are printed but not written (so a partial run never overwrites the baseline).
"""

import argparse
import json
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from hiddenink_eval import report
from hiddenink_eval.metrics import detection, false_positives, timing
from hiddenink_eval.runner import Runner

ROOT = Path(__file__).resolve().parent.parent
LAYER = {"id": "local", "title": "rules-only baseline (local engine)"}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--corpus", type=Path, default=ROOT / "corpus")
    ap.add_argument("--bundle", type=Path, default=ROOT / "core/dist/hiddenink-core.iife.js")
    ap.add_argument("--out", type=Path, default=ROOT / "eval/results")
    ap.add_argument("--repeat", type=int, default=3, help="scans per file; the median time is kept")
    ap.add_argument("--only", help="only files whose id contains this text (prints, doesn't write)")
    args = ap.parse_args()

    if not args.bundle.exists():
        print(f"Missing {args.bundle}. Run `pnpm build:core` (or use `pnpm eval`, which builds it).", file=sys.stderr)
        return 1
    manifest = json.loads((args.corpus / "manifest.json").read_text(encoding="utf-8"))
    items = [i for i in manifest["items"] if not args.only or args.only in i["id"]]
    if not items:
        print(f"No corpus items match --only {args.only!r}", file=sys.stderr)
        return 1

    runner = Runner(args.bundle, args.corpus, args.repeat)
    print(f"Scanning {len(items)} files ×{args.repeat} in Chrome…")
    rows = runner.run(items, on_progress=_progress)

    meta = {
        "layer": LAYER["id"],
        "layer_title": LAYER["title"],
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "git_commit": _git_commit(),
        "chrome_version": runner.chrome_version,
        "corpus_files": len(items),
        "corpus_counts": dict(Counter(i["label"] for i in items)),
        "repeat": args.repeat,
        "pdf_cold_start_ms": runner.pdf_cold_start_ms,
        "bundle_bytes": args.bundle.stat().st_size,
    }
    _print_headline(rows)
    if args.only:
        print("(--only: results not written)")
    else:
        for p in report.write_all(rows, meta, args.out, LAYER["id"]):
            print(f"wrote {p.relative_to(ROOT)}")
    return 1 if any(r.error for r in rows) else 0


def _progress(n: int, total: int, r) -> None:
    mark = {"TP": "✓", "TN": "✓", "FN": "✗ missed", "FP": "✗ false alarm"}[r.outcome]
    if r.error:
        mark = f"! error: {r.error}"
    print(f"  [{n:>3}/{total}] {r.id:<58} {r.scan_ms:>7.1f} ms  {mark}")


def _print_headline(rows) -> None:
    d, fp, t = detection(rows), false_positives(rows), timing(rows)
    print()
    print(f"Detection (any flagged finding): {d['overall']['detected']}   "
          f"strict (right technique): {d['overall']['detected_strict']}")
    print(f"  obvious: {d['obvious']['detected']}   subtle: {d['subtle']['detected']}   "
          f"hidden text found: {d['overall']['found']}")
    print(f"False positives: benign {fp['benign']}   hidden-benign {fp['hidden_benign']}")
    for kind in ("html", "pdf"):
        if kind in t:
            print(f"Scan time {kind}: median {t[kind]['median_ms']} ms, worst {t[kind]['max_ms']} ms "
                  f"({t[kind]['slowest_file']})")
    print()


def _git_commit() -> str:
    try:
        sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        dirty = subprocess.run(["git", "status", "--porcelain", "--", "core/src", "corpus"], cwd=ROOT,
                               capture_output=True, text=True).stdout.strip()
        return sha + ("-dirty" if dirty else "")
    except OSError:
        return "unknown"


if __name__ == "__main__":
    sys.exit(main())
