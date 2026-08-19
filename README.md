# IrMeetingApp

A real-time Meetup-like web application for creating and joining tech meetings. Users authenticate via Google OAuth, create meetings, join/leave as participants, and receive live updates via WebSockets.

## Tech Stack

| Layer          | Technology                                   |
|----------------|----------------------------------------------|
| Backend        | Node.js, Express 5, TypeScript 7             |
| Database       | SQLite via better-sqlite3                    |
| Realtime       | Socket.IO (WebSocket with polling fallback)  |
| Auth           | Google OAuth 2.0 + JWT access/refresh tokens |
| Frontend       | React 18, Vite, TypeScript, Tailwind CSS     |
| Backend Tests  | Vitest + Supertest (84+ tests)               |
| Frontend Tests | Vitest + Testing Library (52+ tests)         |
| E2E Tests      | Playwright (Chromium)                        |

## Project Structure

```
IrMeetingApp/
├── backend/          # Express REST API + WebSocket server
│   ├── src/
│   │   ├── config/   # Environment validation (Zod)
│   │   ├── db/       # SQLite connection, migrations
│   │   ├── middleware/# Auth, validation, rate limiting
│   │   ├── routes/   # API route handlers
│   │   ├── services/ # Business logic
│   │   ├── websocket/# Socket.IO setup + events
│   │   └── utils/    # JWT, errors, logger
│   └── README.md     # Backend-specific docs
├── frontend/         # React SPA
│   ├── src/
│   │   ├── api/      # API client with token refresh
│   │   ├── auth/     # AuthContext, ProtectedRoute
│   │   ├── components/# UI + meeting components
│   │   ├── hooks/    # Custom React hooks
│   │   └── pages/    # Route page components
│   └── README.md
├── tests/            # Playwright E2E tests
│   ├── e2e/          # Spec files (auth, meetings, participants, realtime)
│   ├── fixtures/     # Test users + meeting templates
│   └── helpers/      # loginAs, authedFetch, resetDb
├── scripts/          # The ONLY two user-facing scripts:
│   ├── dev.{ps1,sh}  # Test mode (dummy OAuth + /api/test/login). Auto-opens browser.
│   ├── prod.{ps1,sh} # Real mode (Google OAuth via backend/.env). Auto-opens browser.
│   ├── test-env.cjs  # Kept for tests/playwright.config.ts via require()
│   └── test-env.{ps1,sh}  # Inlined test overlay, dot-sourced by dev.{ps1,sh}.
└── documents/        # Architecture & design docs
```

## Quick Start

The app has **exactly two** scripts:

- **`dev.{ps1,sh}`** — test mode. No `.env` needed, uses dummy OAuth + the dev-only `/api/test/login` endpoint. Loads [http://localhost:5173](http://localhost:5173) in your browser.
- **`prod.{ps1,sh}`** — production-like mode. Reads real Google OAuth from `backend/.env`. Inline env-wizard creates `.env` for you when missing. Loads [http://localhost:5173](http://localhost:5173) in your browser.

Both scripts auto-install any missing npm dependencies on first run (root + backend + frontend + tests, plus Playwright Chromium if tests are missing). Re-running them is safe and idempotent.

### Prerequisites

- Node.js 20+
- PowerShell 5.1+ on Windows (any Linux/macOS bash 3+ for non-Windows users)
- (Production mode only) A Google Cloud Console project with OAuth 2.0 credentials
  - Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
  - Full step-by-step walkthrough (screenshots-equivalent instructions, troubleshooting FAQ): **[docs/google-oauth-setup.md](documents/google-oauth-setup.md)**

### Google OAuth credentials (production mode only)

`scripts/prod.sh` / `scripts/prod.ps1` need three values written into `backend/.env`:

| Variable                 | Where it comes from                                                                 |
|--------------------------|--------------------------------------------------------------------------------------|
| `GOOGLE_CLIENT_ID`       | "Your Client ID" in the OAuth-client-created modal (ends in `.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET`   | "Your Client secret" in the same modal (starts with `GOCSPX-`) — **shown only once** |
| `GOOGLE_REDIRECT_URI`    | The redirect URI you entered in the Cloud Console's "Authorized redirect URIs" field |

Quick recap (the full walkthrough is in [docs/google-oauth-setup.md](documents/google-oauth-setup.md)):

  1. Sign in to <https://console.cloud.google.com/> with your Gmail.
  2. Create a new project (e.g. `IrMeetingApp Local`).
  3. **APIs & Services → OAuth consent screen** → User type: **External** → fill app name + your Gmail → **Save and Continue** → add your Gmail as a **Test user**.
  4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application** → Authorized redirect URI: `http://localhost:3001/api/auth/google/callback` → **Create**.
  5. Copy the **Client ID** + **Client secret** from the resulting modal.
  6. Run `bash scripts/prod.sh` (or `pwsh -File scripts/prod.ps1`); the inline wizard pastes both values into `backend/.env` for you.

> Why a separate doc instead of inline? Google Console's UI has 5+ screens with exact field-name requirements (and the `redirect_uri_mismatch` trap is unforgiving — byte-exact match required). Documents are easier to copy/paste from, follow on a second monitor, and link to from a Slack escalation than inline wizard text. The wizard still prints a condensed 6-step summary on first run, so you don't need to leave the terminal.

### Run the app

**TEST mode (no .env needed, viewable in browser):**

```powershell
# Windows
pwsh -NoProfile -File scripts/dev.ps1
```

```bash
# Linux / macOS
bash scripts/dev.sh
```

Both spawn backend + frontend as concurrent children, then open [http://localhost:5173](http://localhost:5173) in your default browser. In test mode, log in by visiting any URL like `http://localhost:5173/auth/callback?token=…` — see `tests/helpers/auth.ts` for how the test helpers mint tokens, or call `POST /api/test/login` manually (body: `{id, email, name}`).

To stop both servers cleanly: `Ctrl+C` in the terminal that ran the script.

> Tip: `package.json` exposes equivalent npm aliases `npm run dev:ps` / `npm run dev:sh` if you prefer `npm` vocabulary.

**PRODUCTION-like mode (real Google OAuth):**

```powershell
# Windows
pwsh -NoProfile -File scripts/prod.ps1
```

```bash
# Linux / macOS
bash scripts/prod.sh
```

If `backend/.env` doesn't exist yet, the script auto-detects that and launches the inline env-wizard (prompts you for Google OAuth credentials + JWT_SECRET; can auto-generate JWT_SECRET with `g`). Once `.env` is recorded, the script drops you straight into production-like mode.

Behavior of the inline env-wizard depends on whether stdin is an interactive TTY:

| Context                                  | What `prod` does                                                                       |
|------------------------------------------|----------------------------------------------------------------------------------------|
| `backend/.env` exists                    | Boots straight into PROD mode.                                                         |
| `backend/.env` missing, interactive TTY  | Runs the inline env-wizard; writes `.env` on success; boots PROD mode.                  |
| `backend/.env` missing, CI / piped       | Exits 1 with a clear hint to create `.env` manually or run prod interactively.         |

Cross-platform: PowerShell reads `[Console]::IsInputRedirected`, Bash reads `[ -t 0 ]`; both share the same 11-field wizard schema, validator set, and 3-attempts-then-bail-on-validation behavior.

You'll need a Google OAuth client ID + secret (create one at [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Web app, with redirect URI `http://localhost:3001/api/auth/google/callback`).

> Tip: `package.json` exposes equivalent npm aliases `npm run prod:ps` / `npm run prod:sh` if you prefer `npm` vocabulary.

### Manual per-subproject setup (legacy)

If you don't want to use the root scripts, the old per-folder flow still works:

```bash
cd backend    && cp .env.example .env && npm install && npm run dev   # http://localhost:3001
cd frontend   && npm install && npm run dev                            # http://localhost:5173
```

## Environment Variables

### Backend (`backend/.env`)

| Variable                   | Required | Default                  | Description                          |
|----------------------------|----------|--------------------------|--------------------------------------|
| `NODE_ENV`                 | No       | `development`            | `development`, `production`, `test`  |
| `PORT`                     | No       | `3001`                   | Server port                          |
| `HOST`                     | No       | `localhost`              | Bind address                         |
| `GOOGLE_CLIENT_ID`         | **Yes**  | —                        | Google OAuth client ID               |
| `GOOGLE_CLIENT_SECRET`     | **Yes**  | —                        | Google OAuth client secret           |
| `GOOGLE_REDIRECT_URI`      | **Yes**  | —                        | `http://localhost:3001/api/auth/...` |
| `JWT_SECRET`               | **Yes**  | —                        | Min 32 characters                    |
| `JWT_EXPIRATION`           | No       | `15m`                    | Access token TTL                     |
| `REFRESH_TOKEN_EXPIRATION` | No       | `30d`                    | Refresh token TTL                    |
| `FRONTEND_URL`             | **Yes**  | —                        | `http://localhost:5173`              |
| `DATABASE_PATH`            | No       | `./data/irmeeting.db`    | SQLite database path                 |

## Testing

```bash
npm test               # all tests: backend + frontend unit + Playwright E2E
npm run test:unit      # backend + frontend unit tests only (no browser)
npm run test:e2e       # Playwright E2E only (auto-starts servers via webServer)
npm run test:e2e:ui    # Playwright with the UI runner (interactive)
```

The E2E suite auto-starts both servers via the `webServer` config in
`tests/playwright.config.ts`, using the same test env (`scripts/test-env.cjs`) that
`scripts/dev.{ps1,sh}` source. No real Google OAuth credentials are needed — tests pump tokens
through the dev-only `/api/test/login` endpoint.

### What gets tested where

| Layer        | Runner   | Count | What it covers                                              |
|--------------|----------|-------|-------------------------------------------------------------|
| Backend      | Vitest   | 84+   | auth, meetings, validation, rate limiting, WebSocket          |
| Frontend     | Vitest   | 52+   | UI components, hooks, AuthContext                            |
| E2E (Playwright) | Chromium | —  | full flows: auth, meeting CRUD, participants, realtime       |

### E2E Test Fixtures

| Fixture     | Purpose                                      |
|-------------|----------------------------------------------|
| `alice`     | Host in most specs                           |
| `bob`       | Typical participant                          |
| `charlie`   | Secondary participant (capacity tests)       |

### E2E Specs

| Spec                  | Tests                                                              |
|-----------------------|--------------------------------------------------------------------|
| `auth.spec.ts`        | Unauthenticated redirect, login via OAuth callback, sign out       |
| `meetings.spec.ts`    | CRUD, validation, search, host-only edit, cancel, My Meetings page |
| `participants.spec.ts`| Join, leave, full capacity, duplicate join (409), multi-user count |
| `realtime.spec.ts`    | Connection indicator, real-time count/title updates, cancel broadcast |
| `tags-timeline.spec.ts`| Create/filter meetings by tag, timeline rendering, dark mode       |

## Scripts Reference

The repo exposes ONLY **two user-facing scripts** per platform (`dev` and `prod`); every prior helper (`setup`, `kill-servers`, `db`, `clean`, `env-wizard`) is gone — its responsibilities are inlined into the two entry points.

| Windows (PowerShell)            | Linux / macOS (Bash)            | Description                                                                                            |
|---------------------------------|---------------------------------|--------------------------------------------------------------------------------------------------------|
| `pwsh -File scripts/dev.ps1`    | `bash scripts/dev.sh`           | Start backend + frontend in **TEST mode** (dummy OAuth, no .env). Auto-installs deps; auto-opens browser.   |
| `pwsh -File scripts/prod.ps1`   | `bash scripts/prod.sh`          | Start backend + frontend in **PROD mode** (real Google OAuth from `backend/.env`). Inline env-wizard if missing; auto-installs deps; auto-opens browser. |
| `npm run dev:ps` / `npm run dev:sh`    | corresponding npm aliases for `dev` |
| `npm run prod:ps` / `npm run prod:sh`  | corresponding npm aliases for `prod` |

**Concurrent-spawn model**

- **Windows (`*.ps1`)** uses `Start-Process -NoNewWindow` so all children share the parent's console; Windows broadcasts Ctrl+C to attached processes natively. The `[Console]::CancelKeyPress` handler waits 200ms to let that broadcast settle, then `taskkill /F /T` reaps any orphaned `npm.cmd` / `tsx watch` / `vite` child processes. Port-scrub (`Get-NetTCPConnection` + `Stop-Process`) runs as belt-and-suspenders.
- **Linux/macOS (`*.sh`)** uses shell **process substitution** (`&> >(sed ...)`), keeping `$!` as the literal `npm` PID (not a subshell wrapper) so `kill -TERM` targets it directly. `trap cleanup INT TERM` sends SIGTERM, waits 300ms, then SIGKILLs stragglers and `lsof`-scrubs the dev ports as belt-and-suspenders.

**Auto-install on first run.** Both scripts check `backend/`, `frontend/`, and `tests/` for `node_modules/`. Any missing subproject gets `npm install --no-audit --no-fund`, and if `tests/` was missing the Playwright Chromium binary is downloaded too. Re-running is a no-op when everything is already installed.

**Shared env (`HOST=127.0.0.1`, `FRONTEND_URL=http://127.0.0.1:5173`, `ENABLE_TEST_ROUTES`, dummy OAuth/JWT) — three files, one source of truth:**

| File                         | Consumed by                                                     |
|------------------------------|------------------------------------------------------------------|
| `scripts/test-env.cjs`        | `tests/playwright.config.ts` (CommonJS `require` — must stay CJS) |
| `scripts/test-env.ps1`        | `scripts/dev.ps1` and `scripts/prod.ps1` (dot-sourced)          |
| `scripts/test-env.sh`         | `scripts/dev.sh` and `scripts/prod.sh` (sourced via `.`)         |

If you ever change the values, update all three files. The `KEEP IN SYNC` comment at the top of every variant spells out the relationship.

### How `dev` and `prod` differ

| Aspect               | `dev` (TEST)                                  | `prod` (PROD)                              |
|----------------------|-----------------------------------------------|-------------------------------------------|
| Auth source          | Dummy OAuth via `/api/test/login`             | Real Google OAuth (`backend/.env`)        |
| `ENABLE_TEST_ROUTES` | `1`                                           | unset (routes 404)                        |
| `JWT_SECRET`         | Hardcoded dev value                            | Whatever is in `backend/.env`             |
| Source of secrets    | `scripts/test-env.{ps1,sh}` (overlay)         | `backend/.env` (real values)              |
| When to use          | Day-to-day dev, E2E tests                     | Production-like smoke testing             |

### Cross-platform notes

- **`dev.ps1` / `prod.ps1` are Windows-only.** Each detects non-Windows at startup and exits 1 with a hint to use the `.sh` sibling. This is intentional — the scripts depend on `taskkill.exe` and `Get-NetTCPConnection`.
- **`dev.sh` / `prod.sh` require bash 4+** for process substitution (`&> >(...)`). macOS's default bash 3.2 won't work — process substitution is a parse-time feature, so invoking through `bash scripts/dev.sh` won't help either. Install bash 4+ from Homebrew (`brew install bash`) so `/opt/homebrew/bin/bash` is on your PATH, then re-run via `bash scripts/dev.sh`.

## API

See [Backend README](backend/README.md) for the full API reference and WebSocket events.

## Documentation

- [System Architecture](documents/architecture.md)
- [API Design](documents/api-design.md)
- [Database Schema](documents/database-schema.md)
- [Authentication Flow](documents/authentication.md)
- [Real-Time Communication](documents/real-time-communication.md)
- [Project Structure](documents/project-structure.md)

## License

MIT
