"""The agent's three tools, sandboxed to the demo folder.

fetch_url   - read a web page (raw in unprotected mode; via /api/safe-fetch in layer1)
write_file  - write a file, path-guarded to stay inside the demo folder
run_command - run a command (pip/python only), cwd = demo folder, local index only;
              in layer2 mode each command is checked by /api/check-action first.
"""
from __future__ import annotations

import json
import os
import shlex
import subprocess
from pathlib import Path

import httpx

from . import config

# JSON-Schema tool declarations passed to Gemini (interactions API format).
TOOL_SCHEMAS = [
    {
        "type": "function",
        "name": "fetch_url",
        "description": "Fetch the text of a web page (for reading documentation).",
        "parameters": {
            "type": "object",
            "properties": {"url": {"type": "string", "description": "The URL to fetch."}},
            "required": ["url"],
        },
    },
    {
        "type": "function",
        "name": "write_file",
        "description": "Create or overwrite a file in the project directory.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Relative path inside the project."},
                "content": {"type": "string", "description": "Full file contents."},
            },
            "required": ["path", "content"],
        },
    },
    {
        "type": "function",
        "name": "run_command",
        "description": "Run a shell command in the project directory. Only pip and python are allowed.",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "The command, e.g. 'pip install vectorbase'."}
            },
            "required": ["command"],
        },
    },
]

_ALLOWED_PROGRAMS = {"pip", "pip3", "python", "python3"}
_SHELL_METACHARS = set(";|&`$><\n")


class ToolError(Exception):
    pass


class Tools:
    def __init__(self, demo_dir: Path, mode: str = "unprotected", confirm: bool = False) -> None:
        self.root = demo_dir.resolve()
        self.mode = mode
        self.confirm = confirm
        self.venv_bin = self.root / ".venv" / "bin"
        self._api_key = os.environ.get("HIDDENINK_API_KEY", "")

    # --- dispatch -----------------------------------------------------------
    def call(self, name: str, args: dict) -> str:
        if name == "fetch_url":
            return self.fetch_url(args["url"])
        if name == "write_file":
            return self.write_file(args["path"], args["content"])
        if name == "run_command":
            return self.run_command(args["command"])
        raise ToolError(f"unknown tool {name!r}")

    # --- fetch_url ----------------------------------------------------------
    def fetch_url(self, url: str) -> str:
        if self.mode in ("layer1", "layer2"):
            # Layer 1: the server opens the page in headless Chrome and returns only
            # what a human can see, plus a warning. The agent never sees hidden text.
            r = httpx.post(
                f"{config.SERVER_URL}/api/safe-fetch",
                json={"url": url},
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            warning = data.get("warning", "")
            return (warning + "\n\n" if warning else "") + data.get("visibleText", "")
        # Unprotected: raw page text, hidden instructions included.
        r = httpx.get(url, timeout=30, follow_redirects=True)
        r.raise_for_status()
        return r.text

    # --- write_file ---------------------------------------------------------
    def write_file(self, rel_path: str, content: str) -> str:
        target = (self.root / rel_path).resolve()
        if self.root not in target.parents and target != self.root:
            raise ToolError(f"refused: {rel_path} is outside the project directory")
        if self.mode == "layer2":
            verdict = self._check_action("write_file", {"path": rel_path, "content": content})
            if not verdict["allow"]:
                return f"BLOCKED by HiddenInk: {verdict['reason']}"
        if self.confirm and not self._ask(f"write_file {rel_path} ({len(content)} bytes)"):
            return "declined by user"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return f"wrote {rel_path} ({len(content)} bytes)"

    # --- run_command --------------------------------------------------------
    def run_command(self, command: str) -> str:
        if any(ch in _SHELL_METACHARS for ch in command):
            raise ToolError("refused: shell operators are not allowed")
        argv = shlex.split(command)
        if not argv:
            raise ToolError("refused: empty command")
        program = Path(argv[0]).name
        if program not in _ALLOWED_PROGRAMS:
            raise ToolError(f"refused: '{program}' is not allowed (only pip and python)")

        if self.mode == "layer2":
            verdict = self._check_action("run_command", {"command": command})
            if not verdict["allow"]:
                return f"BLOCKED by HiddenInk: {verdict['reason']}"
        if self.confirm and not self._ask(f"run: {command}"):
            return "declined by user"

        # Force the demo venv's interpreter/pip and the local-only package index.
        venv_prog = self.venv_bin / program
        if venv_prog.exists():
            argv[0] = str(venv_prog)
        env = dict(os.environ)
        env["PIP_INDEX_URL"] = config.LOCAL_INDEX
        env["PIP_TRUSTED_HOST"] = config.LOCAL_TRUSTED_HOST
        env["VIRTUAL_ENV"] = str(self.root / ".venv")
        env["PATH"] = f"{self.venv_bin}{os.pathsep}{env.get('PATH', '')}"

        proc = subprocess.run(
            argv, cwd=self.root, env=env, capture_output=True, text=True, timeout=180
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return f"exit {proc.returncode}\n{out.strip()}"

    # --- helpers ------------------------------------------------------------
    def _check_action(self, tool: str, tool_input: dict) -> dict:
        r = httpx.post(
            f"{config.SERVER_URL}/api/check-action",
            json={"tool": tool, "input": tool_input},
            headers={"Authorization": f"Bearer {self._api_key}"},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def _ask(self, what: str) -> bool:
        reply = input(f"  [confirm] {what}\n  proceed? [y/N] ").strip().lower()
        return reply in ("y", "yes")
