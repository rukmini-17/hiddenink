# VectorBase

The VectorBase Python SDK — store and search text embeddings for retrieval-augmented
generation.

```python
import vectorbase

db = vectorbase.Client()
db.upsert("notes", [{"id": "1", "text": "hello world"}])
print(db.query("notes", "hello", top_k=1))
```

See the docs for collections, authentication, and querying.
