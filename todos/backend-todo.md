# Backend Implementation Todo

## 1. Project Setup

- [x] Initialize npm project (`npm init -y`)
- [x] Install dependencies:
  - `express`, `better-sqlite3`, `socket.io`
  - `jsonwebtoken`, `zod`, `cors`, `helmet`
  - `express-rate-limit`, `pino`, `google-auth-library`
- [x] Install dev dependencies:
  - `typescript`, `@types/*` packages
  - `vitest`, `supertest`, `tsx`, `nodemon`
- [x] Create `tsconfig.json` (strict mode, paths)
- [x] Create `.env.example`
- [x] Create `vitest.config.ts`
- [x] Add scripts: `dev`, `build`, `start`, `test`, `lint`

## 2. Core Server Setup

- [x] Create `src/index.ts` — server entry point
  - [x] Import and validate env vars
  - [x] Create HTTP server
  - [ ] Initialize WebSocket server (deferred to Section 7)
  - [x] Start listening on configured port
  - [x] Handle graceful shutdown (SIGTERM/SIGINT)
- [x] Create `src/app.ts` — Express app
  - [x] Configure Helmet
  - [x] Configure CORS
  - [x] Configure JSON body parser
  - [x] Configure rate limiter
  - [x] Mount route handlers
  - [x] Configure 404 handler
  - [x] Configure global error handler
- [x] Create `src/config/env.ts` — Zod env validation
- [x] Create `src/utils/logger.ts` — Pino logger

## 3. Database Layer

- [x] Create `src/db/connection.ts`
  - [x] better-sqlite3 singleton
  - [x] WAL mode enabled
  - [x] Foreign keys enabled
- [x] Create migration system
  - [x] Migration runner class
  - [x] Reads `src/db/migrations/*.sql` files
  - [x] Tracks executed migrations in `_migrations` table
- [x] Write migration `001_create_users.sql`
- [x] Write migration `002_create_meetings.sql`
- [x] Write migration `003_create_participants.sql`
- [x] Write migration `004_create_refresh_tokens.sql`
- [x] Create `src/db/seed.ts` — dev seed data

## 4. Type Definitions

- [x] Create `src/types/models.ts`
  - [x] `User` interface
  - [x] `Meeting` interface
  - [x] `Participant` interface
  - [x] `RefreshToken` interface
- [x] Create `src/types/express.d.ts`
  - [x] Augment Express Request with `user` property
- [x] Create `src/utils/errors.ts`
  - [x] `AppError` base class
  - [x] `NotFoundError`
  - [x] `UnauthorizedError`
  - [x] `ForbiddenError`
  - [x] `ConflictError`
  - [x] `ValidationError`

## 5. Authentication

- [x] Create `src/utils/jwt.ts`
  - [x] `generateAccessToken(user)` → JWT string
  - [x] `verifyAccessToken(token)` → user payload
  - [x] `generateRefreshToken()` → random hex string
  - [x] `hashToken(token)` → SHA-256 hash for storage
- [x] Create `src/services/authService.ts`
  - [x] `getGoogleAuthUrl()` — generates Google OAuth URL
  - [x] `handleGoogleCallback(code)` — exchanges code, returns tokens
  - [x] `createOrUpdateUser(googleProfile)` — upserts user
  - [x] `generateTokens(user)` — creates access + refresh tokens
  - [x] `refreshAccessToken(refreshToken)` — validates and rotates
  - [x] `revokeRefreshToken(token)` — deletes from DB
- [x] Create `src/middleware/authenticate.ts`
  - [x] Extract Bearer token from Authorization header
  - [x] Verify JWT
  - [x] Attach user to `req.user`
  - [x] Return 401 on failure
- [x] Create `src/middleware/optionalAuth.ts`
  - [x] Same as authenticate but doesn't fail
  - [x] Sets `req.user = null` if no/invalid token
- [x] Create `src/middleware/validate.ts`
  - [x] Factory function: `validate(schema: ZodSchema)`
  - [x] Validates `req.body`, `req.query`, `req.params`
  - [x] Returns 400 with structured errors
- [x] Create `src/middleware/rateLimiter.ts`
  - [x] General API limiter (100 req/min)
  - [x] Auth endpoint limiter (10 req/min)
- [x] Create `src/routes/auth.routes.ts`
  - [x] `GET /auth/google`
  - [x] `GET /auth/google/callback`
  - [x] `POST /auth/refresh`
  - [x] `GET /auth/me` (protected)

## 6. Meeting CRUD

- [x] Create `src/services/meetingService.ts`
  - [x] `createMeeting(data, hostId)` — create meeting
  - [x] `getMeetings(filters, pagination)` — list meetings
  - [x] `getMeetingById(id, userId?)` — get with optional join status
  - [x] `updateMeeting(id, userId, data)` — host-only update
  - [x] `deleteMeeting(id, userId)` — host-only delete
  - [x] `joinMeeting(id, userId)` — add participant
  - [x] `leaveMeeting(id, userId)` — remove participant
  - [x] `getUserMeetings(userId)` — user's meetings
- [x] Create Zod validation schemas
  - [x] `createMeetingSchema`
  - [x] `updateMeetingSchema`
  - [x] `meetingQuerySchema`
- [x] Create `src/routes/meeting.routes.ts`
  - [x] `GET /meetings` (public, optional auth)
  - [x] `POST /meetings` (protected)
  - [x] `GET /meetings/:id` (public, optional auth)
  - [x] `PUT /meetings/:id` (protected, host-only)
  - [x] `DELETE /meetings/:id` (protected, host-only)
  - [x] `POST /meetings/:id/join` (protected)
  - [x] `POST /meetings/:id/leave` (protected)
  - [x] `GET /meetings/my` (protected)

## 7. WebSocket

- [x] Create `src/websocket/index.ts`
  - [x] Socket.IO server setup with CORS
  - [x] Auth middleware (optional, for JWT)
  - [x] Connection handler
  - [x] `meeting:subscribe` handler — joins room
  - [x] `meeting:unsubscribe` handler — leaves room
  - [x] Global room auto-join for meeting list updates
  - [x] Disconnect handler — cleanup
- [x] Create `src/websocket/events.ts`
  - [x] `emitMeetingCreated(meeting)` — broadcast to global
  - [x] `emitMeetingUpdated(meeting)` — broadcast to meeting room
  - [x] `emitMeetingDeleted(meetingId)` — broadcast to global + room
  - [x] `emitMeetingCancelled(meetingId)` — broadcast to room
  - [x] `emitParticipantJoined(meetingId, participant)` — to room
  - [x] `emitParticipantLeft(meetingId, userId)` — to room
- [x] Update meeting service to call WebSocket events
  - [x] On create → `emitMeetingCreated`
  - [x] On update → `emitMeetingUpdated` + `emitMeetingCancelled` if status=cancelled
  - [x] On delete → `emitMeetingDeleted`
  - [x] On join → `emitParticipantJoined` + `emitMeetingUpdated`
  - [x] On leave → `emitParticipantLeft` + `emitMeetingUpdated`
- [x] Wire WebSocket server into `index.ts`

## 8. Middleware & Error Handling

- [x] Create `src/middleware/errorHandler.ts`
  - [x] Catch `AppError` subclasses
  - [x] Return structured error JSON
  - [x] Log unexpected errors
  - [x] Hide stack traces in production
- [x] Create `src/routes/health.routes.ts`
  - [x] `GET /health`
- [x] Create `src/routes/index.ts`
  - [x] Aggregate all route files
  - [x] Apply prefixes

## 9. Testing

- [x] Write auth service tests
- [x] Write meeting service tests
- [x] Write API endpoint tests (supertest)
  - [x] Health endpoint
  - [ ] Auth endpoints (mock Google OAuth) _(covered in `tests/` E2E)_
  - [x] Meeting CRUD endpoints
  - [x] Join/Leave endpoints
- [ ] Write WebSocket event tests _(pending)_
- [x] Write validation error tests
- [x] Write rate limiter tests

## 10. Final Polish

- [x] Add compression middleware
- [x] Add request ID middleware
- [x] Add response time logging
- [ ] Create production Dockerfile (optional)
- [ ] Create `README.md` for backend _(pending)_
