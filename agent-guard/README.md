# agent-guard — Claude Code config for the protected demo

This connects Claude Code to the HiddenInk MCP server and stops it from fetching pages
any other way, so it must read docs through `safe_fetch` (Layer 1). The Layer-2 PreToolUse
hook is added here in R3.

Verified against the current Claude Code docs (code.claude.com/docs — `mcp`, `permissions`).
MCP server config lives in **`.mcp.json`** (project root); the `WebFetch` deny lives in
**`.claude/settings.json`**. Two files, two locations.

## Install into the demo project

From the demo project folder (where you run `claude`):

```bash
cp /path/to/hiddenink/agent-guard/.mcp.json       ./.mcp.json
mkdir -p .claude
cp /path/to/hiddenink/agent-guard/settings.json   ./.claude/settings.json
export HIDDENINK_TOKEN="$HIDDENINK_API_KEY"   # same value the server uses
```

`${HIDDENINK_TOKEN}` is expanded from the environment at runtime, so no token is written
into the committed files. (The server reads `HIDDENINK_API_KEY`; export `HIDDENINK_TOKEN`
to the same value for the MCP header — a non-credential-named var so Claude Code expands
it.)

Equivalent CLI instead of copying `.mcp.json`:

```bash
claude mcp add --transport http hiddenink http://localhost:8787/mcp \
  --header "Authorization: Bearer ${HIDDENINK_TOKEN}" --scope project
```

## What the settings do

- `permissions.deny: ["WebFetch", "Bash(curl *)", "Bash(wget *)"]` — removes the built-in
  web fetch and blocks shell fetches, so the only way to read a page is `safe_fetch`.
- `permissions.allow: ["mcp__hiddenink__*"]` — auto-approves the HiddenInk MCP tools.

Claude Code asks you to approve a project-scoped MCP server the first time. Reset with
`claude mcp reset-project-choices`.
