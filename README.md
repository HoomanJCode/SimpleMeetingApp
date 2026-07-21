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
- A Google Cloud Console project with OAuth 2.0 credentials
  - Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, FRONTEND_URL
npm install
npm run dev
```

The backend starts on `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.

### 3. Open the App

Navigate to [http://localhost:5173](http://localhost:5173) and sign in with Google.

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

### Backend Unit + Integration Tests

```bash
cd backend
npm test                # 53+ tests (auth, meetings, validation, rate limiting)
npm run test:watch      # Watch mode
```

### Frontend Unit Tests

```bash
cd frontend
npm test                # 39+ tests (components, hooks, auth context)
npm run test:watch      # Watch mode
```

### E2E Tests (Playwright)

The E2E tests require both backend and frontend running. Playwright handles this automatically via the `webServer` config.

```bash
cd tests
npm install
npx playwright install chromium
npx playwright test     # Headless (CI)
npx playwright test --headed  # Visible browser
npx playwright test --ui      # UI mode
```

> **Note:** The webServer in `tests/playwright.config.ts` provides dummy Google OAuth env vars. E2E tests bypass the real Google flow via a dev-only `/api/test/login` endpoint. To run E2E tests, no real OAuth credentials are needed.

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

### Backend

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `npm run dev`         | Dev server with hot reload (`tsx watch`) |
| `npm run build`       | Compile to `dist/` (`tsc`)               |
| `npm start`           | Run compiled server                      |
| `npm test`            | Run tests (Vitest)                       |
| `npm run lint`        | Type-check (`tsc --noEmit`)              |

### Frontend

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `npm run dev`         | Dev server (Vite)                        |
| `npm run build`       | Type-check + production build            |
| `npm run preview`     | Preview production build                 |
| `npm test`            | Run tests (Vitest)                       |
| `npm run lint`        | Type-check (`tsc --noEmit`)              |

### Tests

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
