"""The metric definitions, checked on small made-up results."""

from hiddenink_eval.metrics import FileResult, detection, false_positives, per_technique, timing


def row(id, label="attack", kind="obvious", expected=("low_contrast",), flagged=(), unflagged=(), ms=10.0, type="html"):
    return FileResult(id=id, type=type, label=label, payload_kind=kind, expected=list(expected),
                      flagged_techniques=list(flagged), unflagged_techniques=list(unflagged),
                      max_ai_score=0.0, scan_ms=ms)


def test_detected_is_any_flag_strict_needs_the_right_technique():
    r = row("a", expected=["low_contrast"], flagged=["unicode_tags"])
    assert r.detected and not r.detected_strict
    assert r.outcome == "TP"


def test_found_counts_unflagged_findings():
    r = row("a", kind="subtle", unflagged=["low_contrast"])
    assert not r.detected and r.found and r.outcome == "FN"


def test_detection_splits_by_payload_kind():
    rows = [
        row("o1", flagged=["low_contrast"]),
        row("o2", flagged=["low_contrast"]),
        row("s1", kind="subtle", unflagged=["low_contrast"]),
        row("s2", kind="subtle", flagged=["low_contrast"]),
        row("b", label="benign", expected=()),
    ]
    d = detection(rows)
    assert str(d["overall"]["detected"]) == "3/4 (75%)"
    assert str(d["obvious"]["detected"]) == "2/2 (100%)"
    assert str(d["subtle"]["detected"]) == "1/2 (50%)"
    assert str(d["subtle"]["found"]) == "2/2 (100%)"


def test_multi_technique_file_counts_once_per_technique():
    rows = [row("job", expected=["low_contrast", "html_comment"], flagged=["low_contrast"], unflagged=["html_comment"])]
    t = per_technique(rows)
    assert str(t["low_contrast"]["flagged"]) == "1/1 (100%)"
    assert str(t["html_comment"]["flagged"]) == "0/1 (0%)"
    assert str(t["html_comment"]["found"]) == "1/1 (100%)"
    assert not rows[0].detected_strict


def test_false_positives_and_hidden_benign_reporting():
    rows = [
        row("b1", label="benign", expected=()),
        row("b2", label="benign", expected=(), flagged=["display_none"]),
        row("k1", label="hidden_benign", kind="keyword_stuffing", unflagged=["low_contrast"]),
        row("k2", label="hidden_benign", kind="keyword_stuffing", flagged=["low_contrast"]),
    ]
    fp = false_positives(rows)
    assert str(fp["benign"]) == "1/2 (50%)"
    assert str(fp["hidden_benign"]) == "1/2 (50%)"
    assert str(fp["hidden_benign_reported"]) == "1/2 (50%)"
    assert rows[1].outcome == "FP" and rows[0].outcome == "TN"


def test_timing_median_and_worst_case():
    rows = [row("h1", ms=5), row("h2", ms=7), row("p1", type="pdf", ms=40), row("p2", type="pdf", ms=90)]
    t = timing(rows)
    assert t["all"]["median_ms"] == 23.5
    assert t["pdf"]["max_ms"] == 90 and t["pdf"]["slowest_file"] == "p2"
    assert t["html"]["median_ms"] == 6
