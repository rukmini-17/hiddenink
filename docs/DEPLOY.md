# HiddenInk — Vultr deploy (server + attacker + docs behind Caddy)

Deploys the HiddenInk server (8787), the DEMO attacker/canary service (8788), and the
static docs site behind Caddy with automatic HTTPS on `<ip>.sslip.io`. **Secrets are typed
into `deploy/.env` on the server only** — never committed, never in an image.

> **Destroy the server after judging.** It's a short-lived demo box.

## Live deployment

**URL: <https://144.202.14.10.sslip.io>** (Vultr, New Jersey, 2 vCPU / 4 GB, Ubuntu 24.04). Firewall
(ufw) allows only 22, 80 and 443. The HiddenInk token is in `deploy/.env` on the server only; it is
shared privately, never in the repo or a group chat.

| What | Address |
|---|---|
| Health | <https://144.202.14.10.sslip.io/health> |
| Docs page (layer 1 demo) | <https://144.202.14.10.sslip.io/docs/quickstart.html> |
| Docs page (layer 2 demo) | <https://144.202.14.10.sslip.io/docs/quickstart-v2.html> |
| Attacker dashboard | <https://144.202.14.10.sslip.io/attacker/> |
| MCP endpoint | `https://144.202.14.10.sslip.io/mcp` |

Verify from a laptop (all four must match):

```bash
curl -s https://144.202.14.10.sslip.io/health; echo                                  # {"ok":true}
curl -s -o /dev/null -w "docs %{http_code}\n" https://144.202.14.10.sslip.io/docs/quickstart.html   # docs 200
curl -s -o /dev/null -w "attacker %{http_code}\n" https://144.202.14.10.sslip.io/attacker/          # attacker 200
curl -s -o /dev/null -w "api without token %{http_code}\n" -X POST https://144.202.14.10.sslip.io/api/safe-fetch \
  -H 'content-type: application/json' -d '{"url":"https://example.com"}'                # api without token 401
```

Authenticated safe-fetch (set `TOKEN` to the HiddenInk token first, without echoing it):

```bash
curl -s -X POST https://144.202.14.10.sslip.io/api/safe-fetch \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"url":"https://144.202.14.10.sslip.io/docs/quickstart.html"}'
# -> removedCount >= 1, the warning sentence, manifest.packages == ["vectorbase"]
```

How it was deployed: the repo is private, so the code went up with
`git archive --prefix=hiddenink/ nisha/deploy | ssh root@<ip> 'tar -x -C /root'` (committed files only,
no `.env`), then `deploy/.env` was written on the server and `docker compose up -d --build` run in
`/root/hiddenink/deploy`.

---

## 1. Make an SSH key (on your Mac, once)

```
ssh-keygen -t ed25519 -C "hiddenink-vultr" -f ~/.ssh/hiddenink_vultr
```
- Press Enter for no passphrase (or set one; you'll type it on connect).
- This writes a **private** key `~/.ssh/hiddenink_vultr` (keep secret) and a **public** key
  `~/.ssh/hiddenink_vultr.pub` (safe to share).

Show the **public** key to paste into Vultr:
```
cat ~/.ssh/hiddenink_vultr.pub
```

(Optional) add a shortcut so `ssh hiddenink` just works after you have the IP — append to
`~/.ssh/config`:
```
Host hiddenink
    HostName <SERVER_IP>
    User root
    IdentityFile ~/.ssh/hiddenink_vultr
```

---

## 2. Vultr settings to pick

- **Product:** Cloud Compute — **Shared CPU** (cheapest that fits).
- **Plan:** at least **2 GB RAM**; pick **2 vCPU / 4 GB** if available. The server runs
  headless Chromium per request plus a Docker build, so 1 GB will OOM — don't go below 2 GB.
- **Region:** closest to the venue (HackUMass, Amherst MA) → **New Jersey** (or Toronto /
  Chicago). Lower latency for the live demo.
- **OS:** **Ubuntu 24.04 LTS x64**.
- **SSH Key:** add the public key from step 1.
- **Extras:** disable Auto Backups (cost); IPv4 enabled (default). No firewall rule needed
  beyond allowing 22, 80, 443 — if you add a Vultr Firewall, open those three.

Deploy, then note the **public IPv4** — your hostname is `<that-ip>.sslip.io`.

---

## 3. Provision the server

```
ssh -i ~/.ssh/hiddenink_vultr root@<SERVER_IP>

# install Docker + the compose plugin (official convenience script)
curl -fsSL https://get.docker.com | sh
docker compose version    # confirm the plugin is present
```

Get the code onto the box (clone your repo, or scp it up). Then:
```
cd hiddenink/deploy
cp .env.example .env
nano .env       # type SITE_ADDRESS=<ip>.sslip.io, HIDDENINK_TOKEN, GEMINI_API_KEY, GEMINI_MANIFEST_MODEL
```

Bring it up (first run builds the images — a few minutes):
```
docker compose up -d --build
docker compose ps
docker compose logs -f caddy     # watch the TLS cert get issued
```

---

## 4. Verify

```
curl https://<ip>.sslip.io/health                     # -> {"ok":true}
open https://<ip>.sslip.io/docs/quickstart.html        # the poisoned docs page
open https://<ip>.sslip.io/attacker/                    # the attacker dashboard
```

---

## 5. Point the laptop demo at the server

On your Mac, instead of `localhost:8787`:
- **MCP** (`hiddenink-demo/.mcp.json`): set `"url": "https://<ip>.sslip.io/mcp"`.
- **Hook / check.sh:** export `HIDDENINK_API_URL=https://<ip>.sslip.io` (same `HIDDENINK_TOKEN`).
- `demo/show_fetch.py` and X-ray can point at `https://<ip>.sslip.io/docs/quickstart.html`.

**Canary note:** the `vectorbase-auth` wheel hard-codes its report URL to
`http://localhost:8788/attacker/collect`. For the *deployed* attacker to light up, either
rebuild the wheel with `CANARY_URL = https://<ip>.sslip.io/attacker/collect`
(edit `demo/packages/vectorbase-auth/src/vectorbase_auth/__init__.py`, rerun
`demo/build_index.py`), or keep the canary scene pointed at a **local** attacker. The
deployed attacker dashboard is still useful to show the UI even if the canary fires locally.

---

## 6. Tear down

```
docker compose down -v     # on the server
```
Then destroy the Vultr instance from the dashboard. Nothing secret is in the repo or images,
but the server's `deploy/.env` dies with the box.
