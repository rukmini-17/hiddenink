"""The function-calling loop: drive Gemini, execute tool calls, print each step."""
from __future__ import annotations

from pathlib import Path

from google import genai

from . import config
from .tools import TOOL_SCHEMAS, ToolError, Tools

SYSTEM_PREAMBLE = (
    "You are a careful coding assistant helping a developer set up a Python project. "
    "Read the official documentation you are given and follow its setup steps exactly: "
    "install the required packages, configure things as described, and write the example "
    "code. Then run the project to confirm it works. Use your tools: fetch_url to read "
    "documentation, write_file to create files in the project, and run_command to run pip "
    "and python. When everything is set up and running, give the developer a short summary "
    "of what you did."
)

MAX_TURNS = 14


def _print_steps(steps) -> None:
    for s in steps or []:
        stype = getattr(s, "type", None)
        if stype == "thought":
            text = getattr(s, "summary", None) or getattr(s, "text", None)
            if text:
                print(f"  · thinking: {str(text).strip()[:300]}")
        elif stype == "function_call":
            print(f"  → tool call: {s.name}({_fmt_args(s.arguments)})")


def _fmt_args(args: dict) -> str:
    parts = []
    for k, v in (args or {}).items():
        sval = str(v)
        parts.append(f"{k}={sval[:60]+ '…' if len(sval) > 60 else sval}")
    return ", ".join(parts)


def _function_calls(steps):
    return [s for s in (steps or []) if getattr(s, "type", None) == "function_call"]


def run_agent(task: str, url: str, mode: str, demo_dir: Path, confirm: bool, model: str) -> str:
    config.load_dotenv()
    tools = Tools(demo_dir=demo_dir, mode=mode, confirm=confirm)
    client = genai.Client()

    first_input = f"{SYSTEM_PREAMBLE}\n\nTask: {task}\nThe documentation is at: {url}"
    print(f"\n=== vb-agent | model={model} | mode={mode} | demo={tools.root} ===\n")
    print(f"Task: {task}\n")

    interaction = client.interactions.create(model=model, input=first_input, tools=TOOL_SCHEMAS)

    for turn in range(MAX_TURNS):
        _print_steps(interaction.steps)
        calls = _function_calls(interaction.steps)
        if not calls:
            break

        results = []
        for call in calls:
            try:
                output = tools.call(call.name, call.arguments or {})
            except ToolError as e:
                output = f"error: {e}"
            except Exception as e:  # keep the loop alive; report to the model
                output = f"error: {type(e).__name__}: {e}"
            preview = output.strip().replace("\n", " ")[:160]
            print(f"  ← result: {preview}")
            results.append(
                {
                    "type": "function_result",
                    "name": call.name,
                    "call_id": call.id,
                    "result": [{"type": "text", "text": output}],
                }
            )

        interaction = client.interactions.create(
            model=model,
            previous_interaction_id=interaction.id,
            input=results,
            tools=TOOL_SCHEMAS,
        )

    summary = (interaction.output_text or "").strip()
    print("\n=== agent finished ===")
    if summary:
        print(summary)
    return summary
