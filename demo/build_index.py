#!/usr/bin/env python3
"""Build the two demo wheels and assemble a PEP 503 "simple" index (DEMO).

Produces:  demo/index/simple/            <- point PIP_INDEX_URL here (served on 8790)
             index.html                   list of projects
             vectorbase/index.html        + the vectorbase wheel
             vectorbase-auth/index.html    + the vectorbase-auth wheel

Run:  python3 demo/build_index.py   (uses `uv build`, which fetches the build backend)
"""
from __future__ import annotations

import html
import re
import shutil
import subprocess
import sys
from pathlib import Path

DEMO = Path(__file__).resolve().parent
PACKAGES = DEMO / "packages"
INDEX = DEMO / "index" / "simple"
PROJECTS = ["vectorbase", "vectorbase-auth"]


def normalize(name: str) -> str:
    # PEP 503 normalized project name.
    return re.sub(r"[-_.]+", "-", name).lower()


def build_wheel(pkg_dir: Path) -> Path:
    dist = pkg_dir / "dist"
    if dist.exists():
        shutil.rmtree(dist)
    subprocess.run(["uv", "build", "--wheel", "--out-dir", str(dist)], cwd=pkg_dir, check=True)
    wheels = sorted(dist.glob("*.whl"))
    if not wheels:
        sys.exit(f"no wheel built in {dist}")
    return wheels[-1]


def project_index_html(project: str, wheel_name: str) -> str:
    link = f'    <a href="{html.escape(wheel_name)}">{html.escape(wheel_name)}</a><br>'
    return (
        "<!doctype html>\n<html><head>"
        f"<title>Links for {html.escape(project)}</title></head>\n<body>\n"
        f"  <h1>Links for {html.escape(project)}</h1>\n{link}\n</body></html>\n"
    )


def root_index_html(projects: list[str]) -> str:
    rows = "\n".join(
        f'    <a href="{normalize(p)}/">{html.escape(p)}</a><br>' for p in projects
    )
    return (
        "<!doctype html>\n<html><head><title>Simple index (DEMO)</title></head>\n"
        f"<body>\n  <h1>Simple index (DEMO)</h1>\n{rows}\n</body></html>\n"
    )


def main() -> None:
    if INDEX.exists():
        shutil.rmtree(INDEX.parent)
    INDEX.mkdir(parents=True)

    for project in PROJECTS:
        wheel = build_wheel(PACKAGES / project)
        proj_dir = INDEX / normalize(project)
        proj_dir.mkdir(parents=True)
        shutil.copy2(wheel, proj_dir / wheel.name)
        (proj_dir / "index.html").write_text(project_index_html(project, wheel.name))
        print(f"  indexed {project}: {wheel.name}")

    (INDEX / "index.html").write_text(root_index_html(PROJECTS))
    print(f"\nPEP 503 index ready at {INDEX}")
    print("Serve it with:  demo/serve_index.sh   (http://localhost:8790/simple/)")


if __name__ == "__main__":
    main()
