"""Turn per-file scan results into the eval's numbers. Pure functions: no browser, no I/O.

Definitions (also in docs/EVAL.md):
- detected:          an attack file has at least one flagged finding (the user gets an alert).
- detected_strict:   every expected technique appears among the file's flagged findings.
- found:             every expected technique appears among ALL findings, flagged or not
                     (the scanner saw the hidden text even if the scorer didn't flag it).
- false positive:    a benign or hidden_benign file with any flagged finding.
"""

from dataclasses import dataclass, field
from statistics import median


@dataclass
class FileResult:
    id: str
    type: str  # html | pdf
    label: str  # attack | hidden_benign | benign
    payload_kind: str
    expected: list[str]
    flagged_techniques: list[str]
    unflagged_techniques: list[str]
    max_ai_score: float
    scan_ms: float  # median over repeats
    error: str | None = None
    findings: list[dict] = field(default_factory=list)  # flagged findings, trimmed, for the miss/FP report

    @property
    def detected(self) -> bool:
        return bool(self.flagged_techniques)

    @property
    def detected_strict(self) -> bool:
        return all(t in self.flagged_techniques for t in self.expected)

    @property
    def found(self) -> bool:
        seen = set(self.flagged_techniques) | set(self.unflagged_techniques)
        return all(t in seen for t in self.expected)

    @property
    def outcome(self) -> str:
        """TP / FN for attacks; FP / TN for benign and hidden_benign."""
        if self.label == "attack":
            return "TP" if self.detected else "FN"
        return "FP" if self.detected else "TN"


@dataclass(frozen=True)
class Rate:
    hits: int
    total: int

    @property
    def value(self) -> float | None:
        return self.hits / self.total if self.total else None

    def __str__(self) -> str:
        return "n/a" if self.total == 0 else f"{self.hits}/{self.total} ({self.value:.0%})"

    def as_dict(self) -> dict:
        return {"hits": self.hits, "total": self.total, "rate": self.value}


def rate(rows: list[FileResult], pred) -> Rate:
    return Rate(sum(1 for r in rows if pred(r)), len(rows))


def attacks(rows: list[FileResult], kind: str | None = None) -> list[FileResult]:
    return [r for r in rows if r.label == "attack" and (kind is None or r.payload_kind == kind)]


def detection(rows: list[FileResult]) -> dict[str, dict[str, Rate]]:
    """Headline detection: overall and by payload kind, lenient + strict + found."""
    out = {}
    for name, kind in (("overall", None), ("obvious", "obvious"), ("subtle", "subtle")):
        group = attacks(rows, kind)
        out[name] = {
            "detected": rate(group, lambda r: r.detected),
            "detected_strict": rate(group, lambda r: r.detected_strict),
            "found": rate(group, lambda r: r.found),
        }
    return out


def per_technique(rows: list[FileResult]) -> dict[str, dict[str, Rate]]:
    """For each expected technique: share of (file, technique) pairs where it was flagged / found.
    A file expecting several techniques (the demo job listing) counts once per technique."""
    techniques = sorted({t for r in attacks(rows) for t in r.expected})
    out = {}
    for t in techniques:
        group = [r for r in attacks(rows) if t in r.expected]
        out[t] = {
            "flagged": rate(group, lambda r: t in r.flagged_techniques),
            "found": rate(group, lambda r: t in r.flagged_techniques or t in r.unflagged_techniques),
            "flagged_obvious": rate([r for r in group if r.payload_kind == "obvious"], lambda r: t in r.flagged_techniques),
            "flagged_subtle": rate([r for r in group if r.payload_kind == "subtle"], lambda r: t in r.flagged_techniques),
            "types": sorted({r.type for r in group}),
        }
    return out


def false_positives(rows: list[FileResult]) -> dict[str, Rate]:
    benign = [r for r in rows if r.label == "benign"]
    hidden = [r for r in rows if r.label == "hidden_benign"]
    return {
        "benign": rate(benign, lambda r: r.detected),
        "hidden_benign": rate(hidden, lambda r: r.detected),
        # hidden_benign should still be *reported* (unflagged), just not flagged.
        "hidden_benign_reported": rate(hidden, lambda r: not r.detected and r.found),
        "all_non_attack": rate(benign + hidden, lambda r: r.detected),
    }


def timing(rows: list[FileResult]) -> dict[str, dict]:
    out = {}
    for name, group in (("all", rows), ("html", [r for r in rows if r.type == "html"]),
                        ("pdf", [r for r in rows if r.type == "pdf"])):
        ok = [r for r in group if r.error is None]
        if not ok:
            continue
        slowest = max(ok, key=lambda r: r.scan_ms)
        out[name] = {
            "files": len(ok),
            "median_ms": round(median(r.scan_ms for r in ok), 1),
            "max_ms": round(slowest.scan_ms, 1),
            "slowest_file": slowest.id,
        }
    return out


def misses(rows: list[FileResult]) -> list[FileResult]:
    """Attacks with no flagged finding, plus any false positives: the rows worth reading."""
    return [r for r in rows if r.outcome in ("FN", "FP")]
