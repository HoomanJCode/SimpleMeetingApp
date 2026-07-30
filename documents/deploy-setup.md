# Deploy Workflow (`deploy.yml`)

This document explains the GitHub Actions deploy workflow for IrMeetingApp, covering
all secrets, environment variables, how SSL works (Cloudflare Tunnel), and the
nginx reverse proxy configuration.

---

## Workflow Overview

The workflow has **3 jobs** that run sequentially:

| Job | Trigger | Purpose |
|---|---|---|
| 🧪 **test** | Always | Runs backend & frontend type-check + tests |
| 🔧 **setup-vps** | After tests pass | Installs system packages (nginx, curl, git, build-essential, python3) and Node.js 20 if missing. Cleans up any broken pre-existing nginx configs. |
| 🚀 **deploy** | After setup-vps | Clones/pulls the repo, builds backend & frontend, writes `.env`, configures nginx, starts the systemd service, configures Cloudflare tunnel if enabled |

Triggered by: pushes to `master` or manual `workflow_dispatch`.

---

## Required GitHub Secrets

These **must** be set in **Repository → Settings → Secrets and variables → Actions**:

| Secret | Purpose | Example |
|---|---|---|
| `VPS_SSH_PRIVATE_KEY` | SSH private key to connect to the VPS | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_HOST` | VPS IP or hostname | `123.45.67.89` |
| `GH_PRIVATE_REPO_TOKEN` | GitHub PAT with `repo` scope for cloning the private repo | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456789-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URL | `https://yourdomain.com/api/auth/google/callback` |

### Optional Secrets

| Secret | Default | Purpose |
|---|---|---|
| `VPS_USER` | `root` | SSH username (`secrets.VPS_USER \|\| 'root'`) |
| `JWT_SECRET` | `auto-generate` | JWT signing secret; auto-generated and persisted across deploys if not set |
| `PORT` | `3001` | Backend port |
| `DOMAIN` | `localhost` | Your app domain, e.g. `yourdomain.com` or `https://yourdomain.com` |
| `CLOUDFLARED` | `false` | Set to `true` to auto-configure the Cloudflare Tunnel ingress rule |

### Optional Variables

| Variable | Default | Purpose |
|---|---|---|
| `JWT_EXPIRATION` | `15m` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRATION` | `30d` | Refresh token lifetime |

---

## SSL / HTTPS — How It Works

**SSL is fully handled by Cloudflare Tunnel.** You do not need to think about SSL
certificates, manage renewals, or set any SSL-related secrets. The architecture:

```
User → https://yourdomain.com → Cloudflare (SSL terminates here) → cloudflared tunnel → VPS nginx (port 80, plain HTTP)
```

- Cloudflare provides HTTPS at the edge for free
- Nginx on the VPS always listens on **HTTP port 80 only** — no SSL certs on the server
- `FRONTEND_URL` is always `https://<your-domain>` regardless of what you put in `DOMAIN`
- The `DOMAIN` secret is parsed to strip any protocol prefix; the result is always treated as https

This means:
- ✅ No certificate provisioning
- ✅ No certificate renewal
- ✅ No SSL configuration in nginx
- ✅ Works as long as cloudflared is running on the VPS

### What You Need

1. A Cloudflare Tunnel already set up on the VPS (`cloudflared tunnel login` + `cloudflared tunnel create`)
2. The domain's DNS pointing to Cloudflare (orange-clouded proxy)
3. Set `CLOUDFLARED=true` in GitHub secrets to let the deploy script auto-add the ingress rule

---

## DOMAIN Parsing

The `DOMAIN` secret accepts these formats:

- `yourdomain.com` → `FRONTEND_URL` becomes `https://yourdomain.com`
- `https://yourdomain.com` → same result
- `http://yourdomain.com` → same result (always upgraded to https)

The protocol prefix is always stripped and replaced with `https://` because
Cloudflare handles SSL termination.

---

## Nginx Configuration

The deploy script generates an nginx site config at
`/etc/nginx/sites-available/irmeeting`:

- **Listen:** port 80 (HTTP only — Cloudflare provides HTTPS)
- **API proxy:** `/api` → `http://127.0.0.1:<PORT>`
- **WebSocket proxy:** `/socket.io` → `http://127.0.0.1:<PORT>` (with upgrade headers for Socket.IO)
- **SPA catch-all:** all other paths serve `index.html` from the frontend build
- **Security headers:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- **Gzip:** enabled for text, css, js, xml, svg

The `default` nginx site is removed. Any other configs in `sites-enabled/` that
were not created by this workflow are left untouched (use the cleanup logic below
if you need to remove them).

### Nginx Cleanup (setup-vps)

The **system packages** step in `setup-vps` runs a cleanup before any
`apt-get` operation:

```bash
for d in /etc/nginx/sites-enabled /etc/nginx/conf.d; do
  [ -d "$d" ] && grep -rl "ssl_certificate\|ssl_certificate_key" "$d" 2>/dev/null | xargs rm -f 2>/dev/null || true
done
```

This finds and deletes any nginx config in `sites-enabled/` or `conf.d/` that
references `ssl_certificate` or `ssl_certificate_key` — handling leftover Jitsi
Meet configs or other broken SSL configs that would prevent nginx from starting.
After cleanup, `dpkg --configure -a` runs to fix half-configured packages.

The cleanup uses `grep | xargs rm` (not `find -delete`) to avoid SSH escaping
issues with escaped parentheses inside the remote command.

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

### SSH fails with usage error (`ssh @***`)

The `VPS_USER` secret is not set. The workflow defaults to `root`. Either add
the secret or ensure `root` SSH login works with your private key.

### nginx fails to start — "cannot load certificate"

There are leftover nginx configs from a previous app (e.g. Jitsi Meet) that
reference missing SSL certificates. The `setup-vps` job automatically removes
any config in `sites-enabled/` or `conf.d/` containing `ssl_certificate`
directives using `find -delete`.

If this still fails, SSH into the VPS and manually run:

```bash
rm -f /etc/nginx/sites-enabled/localhost.conf
rm -f /etc/nginx/conf.d/*.conf   # if any SSL configs there
dpkg --configure -a
systemctl start nginx
```

### `fatal: could not read Username` when cloning

The repository is private — the VPS needs a GitHub token to clone.  Create
one at https://github.com/settings/tokens (classic token, **repo** scope,
no expiration).  Add it as the `GH_PRIVATE_REPO_TOKEN` secret in your
repo's Actions secrets.  The deploy script injects it into the clone URL:
`https://<token>@github.com/HoomanJCode/IrMeetingApp.git`.

### `debconf: unable to initialize frontend` errors

Occurs when `apt-get` runs over SSH without a TTY. The workflow sets
`DEBIAN_FRONTEND=noninteractive` in all steps that use apt.

### Cloudflare Tunnel ingress not updating

The deploy script uses `sed` to insert ingress rules. If the
`~/.cloudflared/config.yml` format doesn't match the expected pattern (ending
with `service: http_status:404`), the insertion fails silently. Verify the
config file format matches the expected structure above.

### Node.js installed but wrong version

The workflow checks for `v20.*` specifically. If a different version is
present, it downloads and runs the NodeSource setup script for v20.

### "1 not fully installed or removed" — nginx stuck in half-configured state

This happens when a previous `apt-get install nginx` failed (usually because
of a broken config that prevented nginx from starting its post-install test).
The `setup-vps` cleanup now handles this by removing broken configs and running
`dpkg --configure -a`. If it persists, SSH in and run the manual fix above.
