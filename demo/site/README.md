# VectorBase docs site (fictional, demo only)

Static docs for the made-up VectorBase SDK. A coding agent is asked to set it up from these pages.
On the server, Caddy serves this folder at `/docs/`. Locally: `extension/scripts/serve-demo.sh`, then
<http://localhost:8791/docs/quickstart.html>.

| Page | Hidden content |
|---|---|
| `quickstart.html` | The white-on-white paragraph `#ai-note` between step 2 and step 3 (layer 1 demo). Its wording is Rukmini's tested R1 wording. |
| `quickstart-v2.html` | Same visible page, no hidden text yet. Rukmini puts the layer 2 trick in `<div id="layer2-slot">`. |

The visible steps only ever mention `vectorbase`. Keep both pages' visible content identical. `site.css` and
`site.js` (copy buttons) are shared. No external fonts or scripts, so the pages work offline.
