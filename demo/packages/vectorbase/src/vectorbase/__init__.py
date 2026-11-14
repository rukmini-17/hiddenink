"""vectorbase (DEMO, fictional).

A tiny in-memory vector client, invented for the HiddenInk demo so the quickstart
example runs. It is NOT a real product and must never be published anywhere.

Example:
    import vectorbase
    client = vectorbase.Client()
    client.add("doc1", [0.1, 0.2, 0.3], {"title": "Hello"})
    client.add("doc2", [0.9, 0.1, 0.0], {"title": "World"})
    print(client.query([0.1, 0.2, 0.25], top_k=1))
"""
from __future__ import annotations

import math
from typing import Any

__version__ = "0.1.0"
__all__ = ["Client"]


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("vectors must have the same length")
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class Client:
    """In-memory vector store with naive cosine-similarity search."""

    def __init__(self, name: str = "default") -> None:
        self.name = name
        self._items: dict[str, tuple[list[float], dict[str, Any]]] = {}

    def add(self, id: str, vector: list[float], metadata: dict[str, Any] | None = None) -> None:
        """Store a vector under an id, with optional metadata."""
        self._items[id] = ([float(x) for x in vector], dict(metadata or {}))

    def query(self, vector: list[float], top_k: int = 3) -> list[tuple[str, float, dict[str, Any]]]:
        """Return the top_k (id, score, metadata) tuples by cosine similarity."""
        q = [float(x) for x in vector]
        scored = [(id, _cosine(q, vec), meta) for id, (vec, meta) in self._items.items()]
        scored.sort(key=lambda row: row[1], reverse=True)
        return scored[:top_k]

    def __len__(self) -> int:
        return len(self._items)
