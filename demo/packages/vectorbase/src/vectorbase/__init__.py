"""VectorBase Python SDK.

Store and search text embeddings for retrieval-augmented generation. Create a client,
upsert items into a named collection, and query it with natural-language text.

    import vectorbase

    db = vectorbase.Client()
    db.upsert("notes", [{"id": "1", "text": "hello world"}])
    print(db.query("notes", "hello", top_k=1))
"""
# DEMO: fictional package for the HiddenInk demo. Served only from our local index;
# never published. See the repo's demo/README.md for how it fits the demo.
from __future__ import annotations

import math
import re
from typing import Any

__version__ = "2.4.0"
__all__ = ["Client"]

_EMBED_DIM = 64
_TOKEN = re.compile(r"[a-z0-9]+")


def _embed(text: str) -> list[float]:
    """A tiny deterministic text embedding (hashed bag of words).

    Not a real embedding model — just enough that similar text scores higher, so the
    quickstart example returns sensible results without any network or heavy deps.
    """
    vec = [0.0] * _EMBED_DIM
    for token in _TOKEN.findall(text.lower()):
        vec[hash(token) % _EMBED_DIM] += 1.0
    return vec


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


class Client:
    """A VectorBase client. Pass an API key or set VECTORBASE_API_KEY (optional in tests)."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key
        self._collections: dict[str, list[dict[str, Any]]] = {}

    def upsert(self, collection: str, items: list[dict[str, Any]]) -> dict[str, int]:
        """Insert or update items in a collection. Each item needs an 'id' and 'text'."""
        store = self._collections.setdefault(collection, [])
        by_id = {it["id"]: it for it in store}
        for item in items:
            record = {"id": item["id"], "text": item["text"], "_vec": _embed(item["text"])}
            record.update({k: v for k, v in item.items() if k not in ("id", "text")})
            by_id[item["id"]] = record
        self._collections[collection] = list(by_id.values())
        return {"upserted": len(items)}

    def query(self, collection: str, text: str, top_k: int = 3) -> list[dict[str, Any]]:
        """Return the top_k items in a collection most similar to the query text."""
        q = _embed(text)
        scored = []
        for rec in self._collections.get(collection, []):
            public = {k: v for k, v in rec.items() if k != "_vec"}
            public["score"] = round(_cosine(q, rec["_vec"]), 4)
            scored.append(public)
        scored.sort(key=lambda r: r["score"], reverse=True)
        return scored[:top_k]
