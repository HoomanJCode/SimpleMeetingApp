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
├── scripts/          # Cross-platform dev/test helpers
│   ├── *.ps1         # PowerShell variants (Windows)
│   ├── *.sh          # Bash variants (Linux / macOS)
│   ├── test-env.cjs  # (kept for tests/playwright.config.ts via require)
│   └── README-of-things... # see "Scripts Reference" below
├── documents/        # Architecture & design docs
└── todos/            # Implementation task lists
```

## Quick Start

### Prerequisites

- Node.js 20+
- PowerShell 5.1+ on Windows (any Linux/macOS bash 3+ for non-Windows users)
- One port-killing tool of `lsof`, `fuser` (psmisc), or `ss` (iproute2) — the kill-servers script auto-falls-back through these. (PowerShell uses the built-in `Get-NetTCPConnection` instead.)
- (Production only) A Google Cloud Console project with OAuth 2.0 credentials
  - Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`

### One-command setup + run

From the project root, in **two** steps:

```bash
npm run setup     # installs all deps (root + backend + frontend + tests) + Playwright
```

Then start backend + frontend in **TEST mode** with the **platform-native script** for your shell:

**Windows (PowerShell 5.1+ or PowerShell 7+):**
```powershell
pwsh -NoProfile -File scripts/dev.ps1
```

**Linux / macOS (bash):**
```bash
bash scripts/dev.sh
```

> Tip: `package.json` exposes convenience npm aliases `npm run dev:ps` and
> `npm run dev:sh` that wrap the same PowerShell / Bash commands, so you can
> stay in the `npm run X` vocabulary if you prefer. The platform-specific
> aliases (`npm run dev:be`, `npm run dev:real`, etc.) follow the same pattern.

Open [http://localhost:5173](http://localhost:5173). In test mode, log in by visiting any URL like
`http://localhost:5173/auth/callback?token=…` — see `tests/helpers/auth.ts` for how the test helpers
mint tokens, or call `POST /api/test/login` manually (body: `{id, email, name}`).

To stop both servers cleanly: `Ctrl+C` in the terminal that ran the script. If a hard kill left
ports 3001/5173 held by zombie processes, run `pwsh -File scripts/kill-servers.ps1` (Windows) or
`bash scripts/kill-servers.sh` (Linux/macOS).

### Production-like mode (real Google OAuth)

If you have (or want to set up) real Google OAuth credentials, pass `--real`:

**Windows:**
```powershell
pwsh -NoProfile -File scripts/dev.ps1 --real
```

**Linux / macOS:**
```bash
bash scripts/dev.sh --real
```

If `backend/.env` doesn't exist yet, the orchestrator auto-detects that and launches
`scripts/env-wizard.ps1`/`.sh` first, then continues into REAL mode once your answers are saved.

```bash
# Or run the wizard on its own to set up .env in isolation:
pwsh -File scripts/env-wizard.ps1   # Windows
bash  scripts/env-wizard.sh         # Linux/macOS
```

Both flows land you in the same place: a normal `backend/.env` written with owner-only
permissions (best-effort on Windows). You'll need a Google OAuth client ID + secret
(create one at [Google Cloud Console](https://console.cloud.google.com/) →
APIs & Services → Credentials → Web app, with redirect URI
`http://localhost:3001/api/auth/google/callback`).

Behavior of the auto-wizard check depends on whether stdin is an interactive TTY:

| Context                                  | What `dev --real` does                                                                  |
|------------------------------------------|------------------------------------------------------------------------------------------|
| `backend/.env` exists                    | Boots straight into REAL mode.                                                          |
| `backend/.env` missing, interactive TTY  | Launches the env-wizard inline, waits, then boots once `.env` is saved.                 |
| `backend/.env` missing, CI / piped       | Exits 1 with a clear hint to run the env-wizard first or pass `--no-wizard` and let your deploy script create `.env`. |
| `backend/.env` missing, `--no-wizard`    | Exits 1 (the flag suppresses auto-launch but still demands the file for safe backend startup). |

Cross-platform: both scripts use the same detection pattern — PowerShell reads `[Console]::IsInputRedirected`, Bash reads `[ -t 0 ]` — and `child_process.spawnSync` / process substitution handle the underlying fork identically across OSes.

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
`tests/playwright.config.ts`, using the same test env (`scripts/test-env.cjs`) as
`scripts/dev.{ps1,sh}`. No real Google OAuth credentials are needed — tests pump tokens
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
| `meetings.spec.ts`    | CRUD, validation, search, host-only edit, delete, My Meetings page |
| `participants.spec.ts`| Join, leave, full capacity, duplicate join (409), multi-user count |
| `realtime.spec.ts`    | Connection indicator, real-time count/title updates, delete redirect|

## Scripts Reference

There are two equivalent scripts for every workflow — one PowerShell (`.ps1`, Windows) and one Bash (`.sh`, Linux/macOS). The `package.json` exposes convenience `npm run X:ps` / `npm run X:sh` aliases that wrap the matching script, so you can stay in `npm` vocabulary if preferred.

### Root orchestrator

Run scripts directly for the lowest-latency invocation, or `npm run <name>:ps`/`:sh` for the npm-alias path.

| Windows (PowerShell)                                       | Linux / macOS (Bash)                                | Description                                                                                                       |
|------------------------------------------------------------|-----------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `pwsh -File scripts/dev.ps1`                               | `bash scripts/dev.sh`                               | Start backend + frontend in TEST mode.                                                                            |
| `pwsh -File scripts/dev.ps1 --real`                        | `bash scripts/dev.sh --real`                        | Same but backend reads `backend/.env` (real Google OAuth). Auto-launches env-wizard if missing + TTY.             |
| `pwsh -File scripts/dev.ps1 --be`                          | `bash scripts/dev.sh --be`                          | Backend only.                                                                                                      |
| `pwsh -File scripts/dev.ps1 --fe`                          | `bash scripts/dev.sh --fe`                          | Frontend only.                                                                                                    |
| `pwsh -File scripts/dev.ps1 --real --no-wizard`            | `bash scripts/dev.sh --real --no-wizard`            | Skip auto-wizard in `--real` (for CI / Docker / deploy scripts that create `.env` themselves).                    |
| `pwsh -File scripts/kill-servers.ps1`                      | `bash scripts/kill-servers.sh`                      | Free ports 3001 + 5173 (reaps zombies from interrupted runs). Idempotent.                                          |
| `pwsh -File scripts/db.ps1 reset`                          | `bash scripts/db.sh reset`                          | Wipe SQLite DB; next backend start re-runs migrations + first-boot seed.                                          |
| `pwsh -File scripts/db.ps1 seed`                           | `bash scripts/db.sh seed`                           | Info on when seeding runs (seed is automatic on first boot of a fresh DB).                                        |
| `pwsh -File scripts/db.ps1 path`                           | `bash scripts/db.sh path`                           | Print absolute DB path.                                                                                           |
| `pwsh -File scripts/env-wizard.ps1`                         | `bash scripts/env-wizard.sh`                        | Interactive wizard creating `backend/.env` for `--real` mode. Validates input, generates JWT_SECRET.              |
| `pwsh -File scripts/clean.ps1`                             | `bash scripts/clean.sh`                             | Remove `dist/`, `test-results/`, `playwright-report/` (preserves DB and `node_modules`).                            |
| *(none)*                                                    | *(none)*                                            | `scripts/test-env.{ps1,sh}` — dot-sourced by env-wizard + dev. Not invoked directly.                              |
| *(none)*                                                    | *(none)*                                            | `scripts/test-env.cjs` — consumed by `tests/playwright.config.ts` via `require()` (CommonJS). Stay-in-sync with the `.ps1` and `.sh` siblings; comment block at the top of each spells out the relationship. |

#### How `dev`/`dev:real` differ

| Aspect              | default (`--no-real` / no flag)               | `--real`                                  |
|---------------------|-----------------------------------------------|-------------------------------------------|
| Auth source         | Dummy OAuth via `/api/test/login`             | Real Google OAuth (`backend/.env`)        |
| `ENABLE_TEST_ROUTES`| `1`                                           | unset (routes 404)                        |
| `JWT_SECRET`        | Hardcoded dev value                            | Whatever is in `backend/.env`             |
| When to use         | Day-to-day dev, E2E tests                     | Production-like smoke testing             |

**Concurrent-spawn model**

- **Windows (`dev.ps1`)** uses `Start-Process -NoNewWindow` so all children share the parent's console; Windows broadcasts Ctrl+C to attached processes natively. The `[Console]::CancelKeyPress` handler waits 200ms to let that broadcast settle, then `taskkill /F /T` reaps any orphaned `npm.cmd` / `tsx watch` / `vite` child processes.
- **Linux/macOS (`dev.sh`)** uses shell **process substitution** (`&> >(sed ...)`), keeping `$!` as the literal `npm` PID (not a subshell wrapper) so `kill -TERM` targets it directly. `trap cleanup INT TERM EXIT` sends SIGTERM, waits 300ms, then SIGKILLs stragglers and lsof-scrubs the dev ports as belt-and-suspenders.

**Shared env (HOST=127.0.0.1, FRONTEND_URL=http://127.0.0.1:5173, ENABLE_TEST_ROUTES, dummy OAuth/JWT) — three files, one source of truth:**

| File                         | Consumed by                                                     |
|------------------------------|------------------------------------------------------------------|
| `scripts/test-env.cjs`        | `tests/playwright.config.ts` (CommonJS `require` — must stay CJS) |
| `scripts/test-env.ps1`        | `scripts/dev.ps1` and `scripts/env-wizard.ps1` (dot-sourced)     |
| `scripts/test-env.sh`         | `scripts/dev.sh` and `scripts/env-wizard.sh` (sourced via `.`)   |

If you ever change the values, update all three files. The `KEEP IN SYNC` comment at the top of every variant spells out the relationship.

### Backend (`cd backend`)

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `npm run dev`         | Dev server with hot reload (`tsx watch`) |
| `npm run build`       | Compile to `dist/` (`tsc`)               |
| `npm start`           | Run compiled server                      |
| `npm test`            | Run tests (Vitest)                       |
| `npm run lint`        | Type-check (`tsc --noEmit`)              |

### Frontend (`cd frontend`)

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `npm run dev`         | Dev server (Vite)                        |
| `npm run build`       | Type-check + production build            |
| `npm run preview`     | Preview production build                 |
| `npm test`            | Run tests (Vitest)                       |
| `npm run lint`        | Type-check (`tsc --noEmit`)              |

### Tests (`cd tests`)

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `npm test`            | Run all E2E specs (headless)             |
| `npm run test:headed` | Run with visible browser                 |
| `npm run test:ui`     | Playwright UI mode                       |
| `npm run report`      | Show HTML report                         |

### Cross-platform notes

- **`dev.ps1` is Windows-only.** It detects non-Windows at startup and exits 1 with a hint to use `dev.sh`. This is intentional — the script depends on `taskkill.exe` and `Get-NetTCPConnection`.
- **`dev.sh` requires bash 4+** for process substitution (`> >(...)`). macOS's default bash 3.2 won't work; either install bash from Homebrew (`brew install bash`) or run via `bash scripts/dev.sh` directly.
- **`kill-servers.ps1`** uses PowerShell's built-in `Get-NetTCPConnection` (PS 5.1+) and `Stop-Process`. Works with no extra dependencies.
- **`kill-servers.sh`** auto-falls back through `lsof` → `fuser` → `ss` so most Linux distros (including minimal Alpine) work out of the box. If none of those are installed, the script exits 1 instead of silently half-succeeding.
- **Both `kill-servers.*`** are idempotent: "was already free" is the success message when nothing is bound.

## API

See [Backend README](backend/README.md) for the full API reference and WebSocket events.

## Documentation

- [System Architecture](documents/architecture.md)
- [API Design](documents/api-design.md)
- [Database Schema](documents/database-schema.md)
- [Authentication Flow](documents/authentication.md)
- [Real-Time Communication](documents/real-time-communication.md)
- [Project Structure](documents/project-structure.md)

## Implementation Plan

- [Master Todo](todos/master-todo-passed.md)
- [Backend Todo](todos/backend-todo-passed.md)
- [Frontend Todo](todos/frontend-todo-passed.md)
- [Testing Todo](todos/testing-todo-passed.md)

## License

MIT
