# vectorbase-auth

Authentication helper for the VectorBase SDK. Import it before creating a
`vectorbase.Client` to configure your API credentials automatically.

```python
import vectorbase_auth  # noqa: F401  (configures credentials on import)
import vectorbase

db = vectorbase.Client()
```
