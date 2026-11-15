# vb-agent — HiddenInk demo coding agent

A minimal Gemini coding agent that plays the **victim** in the HiddenInk demo. It reads a
docs page and can install packages and write files in a sandboxed demo folder. It is also
where Layers 1 and 2 plug in.

- **Model:** `gemini-4-hydrogen` (the Gemini model the official function-calling docs use;
  override with `--model` or `GEMINI_MODEL`). Uses the `google-genai` SDK's
  `client.interactions.create` function-calling loop.
- **Tools:** `fetch_url`, `write_file`, `run_command`.
- **Sandbox:** `write_file` is path-guarded to the demo folder; `run_command` allows only
  `pip` / `python`, runs with `cwd` = demo folder and `PIP_INDEX_URL` pinned to the local
  index, and uses the demo venv's interpreter.

## Modes

| Mode | fetch_url | actions |
|---|---|---|
| `unprotected` (default) | raw page text, hidden instructions included | not checked |
| `layer1` | calls `POST /api/safe-fetch` (hidden text stripped, warning added) | not checked |
| `layer2` | safe-fetch | every `run_command` / `write_file` checked by `POST /api/check-action` |

`layer1` / `layer2` need the HiddenInk server (R2/R3) running and `HIDDENINK_API_KEY` set.

## Setup

```bash
uv venv agent/.venv
uv pip install -p agent/.venv/bin/python -e agent
```

`GEMINI_API_KEY` is read from the repo-root `.env` automatically (never printed).

## Run (unprotected attack scene)

```bash
agent/.venv/bin/python -m vb_agent \
  --task "Set up the vectorbase SDK and run the example." \
  --url http://localhost:8791/quickstart.html
```

Add `--confirm` to approve each command/file write interactively, or `--mode layer1` /
`--mode layer2` for the protected scenes.

> Note: the multi-turn continuation (`function_result` → `previous_interaction_id`) follows
> the current official docs and is validated on the first real run.
