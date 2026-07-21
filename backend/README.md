# IrMeeting Backend

REST API + WebSocket server for the IrMeeting application. Built with Express 5, TypeScript, SQLite (better-sqlite3), and Socket.IO.

## Prerequisites

- Node.js 20+
- Google Cloud Console project with OAuth 2.0 credentials

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials (see below)
npm install
npm run dev
```

## Environment Variables

| Variable                    | Required | Default                  | Description                          |
|-----------------------------|----------|--------------------------|--------------------------------------|
| `NODE_ENV`                  | No       | `development`            | `development`, `production`, or `test` |
| `PORT`                      | No       | `3001`                   | HTTP server port                     |
| `HOST`                      | No       | `localhost`              | Server bind address                  |
| `GOOGLE_CLIENT_ID`          | **Yes**  | —                        | Google OAuth client ID               |
| `GOOGLE_CLIENT_SECRET`      | **Yes**  | —                        | Google OAuth client secret           |
| `GOOGLE_REDIRECT_URI`       | **Yes**  | —                        | OAuth callback URL                   |
| `JWT_SECRET`                | **Yes**  | —                        | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRATION`            | No       | `15m`                    | Access token lifetime                |
| `REFRESH_TOKEN_EXPIRATION`  | No       | `30d`                    | Refresh token lifetime               |
| `FRONTEND_URL`              | **Yes**  | —                        | Frontend origin (CORS + redirects)   |
| `DATABASE_PATH`             | No       | `./data/irmeeting.db`    | SQLite database file path            |

## Scripts

| Script         | Description                                       |
|----------------|---------------------------------------------------|
| `npm run dev`  | Start dev server with hot reload (`tsx watch`)    |
| `npm run build`| Compile TypeScript to `dist/`                     |
| `npm start`    | Run compiled server (`node dist/index.js`)        |
| `npm test`     | Run unit + integration tests (Vitest)             |
| `npm run lint` | Type-check without emitting (`tsc --noEmit`)      |

## API Overview

All endpoints are prefixed with `/api`.

### Authentication

| Method | Path                      | Auth     | Description                        |
|--------|---------------------------|----------|------------------------------------|
| GET    | `/api/auth/google`        | Public   | Redirect to Google OAuth consent   |
| GET    | `/api/auth/google/callback` | Public | OAuth callback, returns tokens     |
| POST   | `/api/auth/refresh`       | Public   | Exchange refresh token for new pair |
| GET    | `/api/auth/me`            | Bearer   | Get current user profile           |

### Meetings

| Method | Path                       | Auth     | Description                        |
|--------|----------------------------|----------|------------------------------------|
| GET    | `/api/meetings`            | Optional | List meetings (search, paginate)   |
| GET    | `/api/meetings/my`         | Bearer   | Get user's hosted + joined meetings|
| GET    | `/api/meetings/:id`        | Optional | Get meeting details + participants |
| POST   | `/api/meetings`            | Bearer   | Create a new meeting               |
| PUT    | `/api/meetings/:id`        | Bearer   | Update meeting (host only)         |
| DELETE | `/api/meetings/:id`        | Bearer   | Delete meeting (host only)         |
| POST   | `/api/meetings/:id/join`   | Bearer   | Join a meeting                     |
| POST   | `/api/meetings/:id/leave`  | Bearer   | Leave a meeting (not host)         |

### Health

| Method | Path              | Auth     | Description                |
|--------|-------------------|----------|----------------------------|
| GET    | `/api/health`     | Public   | Server health check        |

### Dev-only (E2E testing)

| Method | Path                 | Auth     | Description                     |
|--------|----------------------|----------|---------------------------------|
| POST   | `/api/test/login`    | Public   | Seed a test user, return tokens |
| POST   | `/api/test/reset`    | Public   | Truncate domain tables          |

> **Note:** Test routes are only mounted when `ENABLE_TEST_ROUTES=1` and `NODE_ENV !== 'production'`.

## Architecture

```
src/
├── index.ts              # Entry point — starts HTTP + WebSocket server
├── app.ts                # Express app factory (middleware, routes, CORS)
├── config/
│   └── env.ts            # Environment variable validation (Zod)
├── db/
│   ├── connection.ts     # SQLite connection (better-sqlite3)
│   ├── migrate.ts        # Run pending SQL migrations
│   └── migrations/       # SQL migration files (001_, 002_, …)
├── middleware/
│   ├── authenticate.ts   # JWT bearer token verification
│   ├── optionalAuth.ts   # Like authenticate but allows unauthenticated
│   ├── validate.ts       # Request body/query validation (Zod)
│   ├── rateLimiter.ts    # Rate limiting (express-rate-limit)
│   ├── errorHandler.ts   # Global error handler
│   └── requestId.ts      # Attach unique request ID to each request
├── routes/
│   ├── index.ts          # Router aggregation
│   ├── auth.routes.ts    # Google OAuth + JWT refresh
│   ├── meeting.routes.ts # Meeting CRUD + join/leave
│   ├── test.routes.ts    # Dev-only E2E seeding
│   └── health.routes.ts  # Health check
├── services/
│   ├── authService.ts    # User creation, token generation/refresh
│   ├── meetingService.ts # Meeting & participant business logic
│   └── meetingSchemas.ts # Zod schemas for meeting validation
├── types/
│   └── models.ts         # TypeScript interfaces (Meeting, User, etc.)
├── utils/
│   ├── errors.ts         # Custom error classes (NotFound, Forbidden, etc.)
│   ├── jwt.ts            # JWT sign/verify helpers
│   └── logger.ts         # Pino logger
└── websocket/
    ├── index.ts          # Socket.IO server setup + auth middleware
    └── events.ts         # Event emitters (meeting:created, participant:joined, etc.)
```

## Real-Time Events (Socket.IO)

| Event                 | Direction       | Payload                                  |
|-----------------------|-----------------|------------------------------------------|
| `meeting:created`     | Server → Client | `Meeting` object                         |
| `meeting:updated`     | Server → Client | `Meeting` object                         |
| `meeting:deleted`     | Server → Client | `{ meetingId: string }`                  |
| `meeting:cancelled`   | Server → Client | `{ meetingId: string }`                  |
| `participant:joined`  | Server → Client | `{ meetingId, participant }`             |
| `participant:left`    | Server → Client | `{ meetingId, userId }`                  |
| `meeting:subscribe`   | Client → Server | `{ meetingId: string }` (subscribe room) |
| `meeting:unsubscribe` | Client → Server | `{ meetingId: string }` (leave room)     |

## Testing

```bash
# Unit + integration tests
npm test

# Watch mode
npm run test:watch

# Type-check only
npm run lint
```

The backend has 84+ tests covering auth service, meeting service, API endpoints (via Supertest), validation, rate limiting, WebSocket events, and integration tests under `backend/tests/`.

## License

MIT
