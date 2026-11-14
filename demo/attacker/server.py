"""DEMO attacker collector for the HiddenInk pitch. Fictional: it only ever receives the fake
credentials the demo package plants. Standard library only, keeps everything in memory.

  POST /attacker/collect  {host, items: [{name, value}], package?, source?}
  GET  /attacker/          dashboard (polls /attacker/events)
  GET  /attacker/events    JSON list of thefts, newest first
  POST /attacker/reset     clears everything

Values are masked on arrival (first 4 characters + "…FAKE"); the full value is never stored or shown.
"""
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("PORT", "8788"))
MAX_BODY = 64 * 1024
MAX_ITEMS = 20
MAX_EVENTS = 50
DASHBOARD = (Path(__file__).parent / "dashboard.html").read_bytes()

_events: list[dict] = []
_lock = threading.Lock()


def mask(value: str) -> str:
    return value[:4] + "…FAKE"


def clip(value, limit: int) -> str:
    return str(value)[:limit] if value is not None else ""


def parse_collect(body: dict) -> dict:
    items = body.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("items must be a non-empty list")
    clean = []
    for item in items[:MAX_ITEMS]:
        if not isinstance(item, dict) or "name" not in item:
            raise ValueError("each item needs a name")
        clean.append({"name": clip(item["name"], 64), "value": mask(clip(item.get("value", ""), 4096))})
    return {
        "host": clip(body.get("host") or "unknown host", 100),
        "items": clean,
        "package": clip(body.get("package"), 100),
        "source": clip(body.get("source"), 200),
        "at": time.time(),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "demo-collector"

    def _send(self, status: int, body: bytes, content_type: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, data) -> None:
        self._send(status, json.dumps(data).encode())

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/attacker":
            self.send_response(301)
            self.send_header("Location", "/attacker/")
            self.end_headers()
        elif path == "/attacker/":
            self._send(200, DASHBOARD, "text/html; charset=utf-8")
        elif path == "/attacker/events":
            with _lock:
                self._json(200, {"events": list(reversed(_events))})
        elif path == "/attacker/health":
            self._json(200, {"ok": True})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/attacker/reset":
            with _lock:
                _events.clear()
            self._json(200, {"ok": True})
            return
        if path != "/attacker/collect":
            self._json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            self._json(413 if length > MAX_BODY else 400, {"error": "bad body size"})
            return
        try:
            event = parse_collect(json.loads(self.rfile.read(length)))
        except (ValueError, json.JSONDecodeError, AttributeError) as e:
            self._json(400, {"error": str(e)})
            return
        with _lock:
            _events.append(event)
            del _events[:-MAX_EVENTS]
        print(f"DEMO collect from {event['host']}: {', '.join(i['name'] for i in event['items'])}", flush=True)
        self._json(200, {"ok": True})

    def log_message(self, *args) -> None:  # keep the console to the collect lines above
        pass


if __name__ == "__main__":
    print(f"DEMO attacker collector on http://localhost:{PORT}/attacker/", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
