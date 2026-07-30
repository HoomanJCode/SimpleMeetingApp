# Deploy Workflow (`deploy.yml`)

This document explains the GitHub Actions deploy workflow for IrMeetingApp, covering
all secrets, environment variables, the SSL/TLS strategy (Cloudflare Tunnel vs.
manual certs), and how the nginx reverse proxy is configured.

---

## Workflow Overview

The workflow has **3 jobs** that run sequentially:

| Job | Trigger | Purpose |
|---|---|---|
| 🧪 **test** | Always | Runs backend & frontend type-check + tests |
| 🔧 **setup-vps** | After tests pass | Ensures system packages (nginx, curl, git, build-essential, python3) and Node.js 20 are installed on the VPS |
| 🚀 **deploy** | After setup-vps | Clones/pulls the repo, builds backend & frontend, writes `.env`, configures nginx, starts the systemd service, configures Cloudflare tunnel if enabled |

Triggered by: pushes to `master` or manual `workflow_dispatch`.

---

## Required GitHub Secrets

These **must** be set in **Repository → Settings → Secrets and variables → Actions**:

| Secret | Purpose | Example |
|---|---|---|
| `VPS_SSH_PRIVATE_KEY` | SSH private key to connect to the VPS | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_HOST` | VPS IP or hostname | `123.45.67.89` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456789-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URL | `https://yourdomain.com/api/auth/google/callback` |

### Optional Secrets

| Secret | Default | Purpose |
|---|---|---|
| `VPS_USER` | `root` | SSH username (the workflow uses `secrets.VPS_USER \|\| 'root'`) |
| `JWT_SECRET` | `auto-generate` | JWT signing secret; auto-generated (persisted across deploys) if not set |
| `PORT` | `3001` | Backend port |
| `DOMAIN` | `localhost` | Your app domain, e.g. `yourdomain.com` or `https://yourdomain.com` |
| `CLOUDFLARED` | `false` | Set to `true` to enable Cloudflare Tunnel auto-configuration |
| `SSL_CERT_B64` | _(empty)_ | Base64-encoded SSL certificate (only needed for manual SSL) |
| `SSL_KEY_B64` | _(empty)_ | Base64-encoded SSL private key (only needed for manual SSL) |

### Optional Variables

| Variable | Default | Purpose |
|---|---|---|
| `JWT_EXPIRATION` | `15m` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRATION` | `30d` | Refresh token lifetime |

---

## SSL / HTTPS Strategy

The deploy workflow supports **two SSL modes**. The choice is determined automatically:

### Mode 1: Cloudflare Tunnel (recommended)

**Set `CLOUDFLARED = true`** in GitHub secrets.

- Cloudflare Tunnel handles SSL termination at Cloudflare's edge — the user
  connects via HTTPS to Cloudflare, and Cloudflare tunnels to your VPS over a
  secure connection.
- Nginx listens on **HTTP port 80 only** (no SSL certs on the VPS).
- The deploy script auto-configures `cloudflared` by adding an ingress rule for
  your domain to `~/.cloudflared/config.yml`.

**Prerequisites:**
- `cloudflared` must already be installed on the VPS and authenticated to a
  Cloudflare Tunnel (`cloudflared tunnel login`).
- The domain's DNS must point to Cloudflare (orange-clouded).

**SSL decision logic:** When `CLOUDFLARED = true`, `USE_SSL` is forced to
`false` — no manual certs are deployed to nginx.

### Mode 2: Manual SSL Certificates

**Do NOT set `CLOUDFLARED` (or set it to `false`).** Provide both
`SSL_CERT_B64` and `SSL_KEY_B64`.

- The deploy script base64-decodes the cert/key into `/opt/irmeeting/ssl/`.
- Nginx is configured with **HTTPS on port 443** + HTTP→HTTPS redirect on port 80.
- The `SSL_CERT_B64` / `SSL_KEY_B64` secrets are not needed (and ignored) when
  using Cloudflare Tunnel.

### Mode 3: Plain HTTP (no SSL)

If all of these are true:
- `CLOUDFLARED` is not `true`
- `SSL_CERT_B64` or `SSL_KEY_B64` is empty
- `DOMAIN` starts with `http://`

...then nginx listens on **port 80 only** with no HTTPS. This is only suitable
for local/VPN testing.

### Summary Table

| CLOUDFLARED | SSL_CERT_B64 | SSL_KEY_B64 | DOMAIN starts with | Result |
|---|---|---|---|---|
| `true` | _(ignored)_ | _(ignored)_ | _(any)_ | **Cloudflare Tunnel** — nginx HTTP only |
| `false` | provided | provided | `https://` | **Manual SSL** — nginx HTTPS + redirect |
| `false` | empty | empty | `http://` | **Plain HTTP** — nginx HTTP only |

---

## DOMAIN Parsing

The `DOMAIN` secret can be provided with or without a protocol prefix:

- `yourdomain.com` → treated as `https://yourdomain.com`
- `https://yourdomain.com` → used as-is
- `http://yourdomain.com` → used as-is (forces plain HTTP if no SSL)

The `FRONTEND_URL` in the backend `.env` is set to the full domain (with protocol).

---

## Nginx Configuration

The deploy script generates an nginx site config at
`/etc/nginx/sites-available/irmeeting`:

- **API proxy:** `/api` → `http://127.0.0.1:<PORT>`
- **WebSocket proxy:** `/socket.io` → `http://127.0.0.1:<PORT>` (with upgrade headers for Socket.IO)
- **SPA catch-all:** All other paths serve `index.html` from the frontend build
- Old nginx configs in `sites-enabled/` (including `default`) are removed
- The `setup-vps` job also cleans up any broken SSL configs that reference
  missing certificates (e.g., leftover Jitsi Meet configs)

---

## Cloudflare Tunnel Auto-Configuration

When `CLOUDFLARED = true` and `cloudflared` is installed on the VPS, the deploy
script:

1. Checks if the domain already has an ingress rule in
   `~/.cloudflared/config.yml`
2. If not, inserts a new ingress rule mapping the domain to
   `http://127.0.0.1:<PORT>`
3. Restarts the cloudflared service (`cloudflared-tunnel` or `cloudflared`)

The expected `cloudflared` config format:

```yaml
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: yourdomain.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

---

## Systemd Service

The backend runs as a systemd service named `irmeeting`:

- **Working directory:** `/opt/irmeeting/backend`
- **Exec:** `node /opt/irmeeting/backend/dist/index.js`
- **User:** `root`
- **Restart policy:** `on-failure` with 10s delay
- **Logs:** `/var/log/irmeeting/backend.log` and `backend_error.log`

---

## Troubleshooting

### SSH fails with usage error

If you see `ssh @***` in the logs, the `VPS_USER` secret is not set. The
workflow defaults to `root`. Either set the secret or ensure `root` works with
your SSH key.

### nginx fails to start: "cannot load certificate"

The VPS may have leftover nginx configs from a previous app (e.g. Jitsi Meet)
that reference missing SSL certificates. The `setup-vps` job now automatically
detects and removes any `sites-enabled/` configs containing `ssl_certificate`
directives before nginx starts. If this still fails, SSH into the VPS and
manually remove files from `/etc/nginx/sites-enabled/`.

### debconf Dialog/Readline errors

These occur when `apt-get` is run over SSH without a TTY. The workflow sets
`DEBIAN_FRONTEND=noninteractive` to prevent this.

### Cloudflare Tunnel ingress not updating

The deploy script uses `sed` to insert ingress rules. If the `~/.cloudflared/config.yml`
format doesn't match the expected pattern (ending with `service: http_status:404`),
the insertion may fail silently. Verify the config file format manually.

### Node.js installed but wrong version

The workflow checks for `v20.*` specifically. If a different Node.js version is
installed, it will download and run the NodeSource setup script for v20.
