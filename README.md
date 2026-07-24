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
├── documents/        # Architecture & design docs
└── todos/            # Implementation task lists
```

## Quick Start

### Prerequisites

- Node.js 20+
- (Production only) A Google Cloud Console project with OAuth 2.0 credentials
  - Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`

### One-command setup + run

From the project root:

```bash
npm run setup    # installs all deps (backend, frontend, tests, root orchestrator)
npm run dev      # starts backend + frontend in TEST mode (dummy OAuth, /api/test/* routes live)
```

Open [http://localhost:5173](http://localhost:5173). In test mode, log in by visiting any URL like
`http://localhost:5173/auth/callback?token=…` — see `tests/helpers/auth.ts` for how the test helpers
mint tokens, or call `POST /api/test/login` manually (body: `{id, email, name}`).

To stop both servers cleanly: `Ctrl+C` in the terminal that ran `npm run dev`. If a hard kill left
ports 3001/5173 held by zombie processes, run `npm run kill`.

### Production-like mode (real Google OAuth)

If you have real `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` + a `JWT_SECRET` in `backend/.env`:

```bash
npm run dev:real   # backend reads .env, test routes are disabled
```

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
`npm run dev`. No real Google OAuth credentials are needed — tests pump tokens
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

### Root orchestrator (run from project root)

These scripts coordinate the three subprojects. They are the recommended way to work
with the codebase day-to-day — use the manual per-folder scripts below only when you need
to debug a single piece in isolation.

| Script                     | Description                                                                                          |
|----------------------------|------------------------------------------------------------------------------------------------------|
| `npm run setup`            | Install deps for root + backend + frontend + tests; install Playwright Chromium                       |
| `npm run dev`              | Start backend + frontend concurrently in TEST mode (dummy OAuth, `/api/test/*` enabled)              |
| `npm run dev:real`         | Same as `dev` but backend reads `backend/.env` (real Google OAuth, no test routes)                   |
| `npm run dev:be`           | Start only the backend (test mode)                                                                   |
| `npm run dev:fe`           | Start only the frontend                                                                              |
| `npm run kill`             | Free ports 3001 + 5173 (kills zombie node.exe after interrupted runs)                                |
| `npm run db:reset`         | Delete the SQLite DB file; next backend start recreates + migrates + seeds                           |
| `npm run db:seed`          | Print info about when seed runs (seed is automatic on first boot of a fresh DB)                      |
| `npm run db:path`          | Print absolute path of the SQLite file                                                               |
| `npm run lint`             | Type-check both backend + frontend                                                                   |
| `npm run build`            | Build backend (`tsc`) + frontend (`tsc -b && vite build`)                                            |
| `npm run start`            | Run the production backend (assumes you've already built; serves frontend `dist/`)                   |
| `npm run preview`          | Preview the production frontend build                                                                |
| `npm test`                 | Run ALL tests (backend unit + frontend unit + E2E)                                                   |
| `npm run test:unit`        | Run backend + frontend unit tests (Vitest) only                                                      |
| `npm run test:be`          | Backend unit tests only                                                                              |
| `npm run test:fe`          | Frontend unit tests only                                                                             |
| `npm run test:e2e`         | Playwright E2E (headless)                                                                            |
| `npm run test:e2e:headed`  | Playwright with visible browser                                                                      |
| `npm run test:e2e:ui`      | Playwright UI mode                                                                                   |
| `npm run test:e2e:report`  | Open the last HTML report (`playwright show-report`)                                                 |
| `npm run clean`            | Remove `dist/`, `test-results/`, `playwright-report/` (preserves DB and node_modules)                |

#### How `dev`/`dev:real` differ

| Aspect              | `npm run dev`                          | `npm run dev:real`                       |
|---------------------|----------------------------------------|------------------------------------------|
| Auth source         | Dummy OAuth via `/api/test/login`      | Real Google OAuth (`backend/.env`)       |
| `ENABLE_TEST_ROUTES`| `1`                                    | unset (routes 404)                       |
| `JWT_SECRET`        | Hardcoded dev value                     | Whatever is in `backend/.env`           |
| When to use         | Day-to-day dev, E2E tests              | Production-like smoke testing            |

The shared values (HOST=127.0.0.1, FRONTEND_URL=http://127.0.0.1:5173) come from
`scripts/test-env.cjs`, which is also imported by `tests/playwright.config.ts` — so
running E2E tests and the dev server never drift out of sync.

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
