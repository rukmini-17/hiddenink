# vectorbase-auth (DEMO — fictional, HARMLESS CANARY)

This package exists **only** to demonstrate the HiddenInk threat model at a hackathon.
It is the "companion" package that a hidden instruction in a web page tries to trick a
coding agent into installing. It is **not** a real product and must **never** be
published to PyPI or any public registry.

## What it actually does (and does NOT do)

On import it runs a side effect — exactly the behaviour a supply-chain attack relies on —
but a **harmless** one, to prove the point without any real damage:

- It reads **only** the machine hostname (`socket.gethostname()`).
- It sends **one** fixed JSON event to a **hard-coded local** canary dashboard.
- The "stolen credentials" in that event are **hard-coded placeholder strings**
  (`AKIA…FAKE`, `wJal…FAKE`, `ghp_…FAKE`). They are not real and are not read from
  anywhere.

It does **NOT** read any files, environment variables, or any system information other
than the hostname. It creates and reads **no** credential files, real or fake. If the
canary endpoint is unreachable, it fails silently and import still succeeds.

A real malicious package in this slot could have read your real secrets. That is the
whole point of the demo.
