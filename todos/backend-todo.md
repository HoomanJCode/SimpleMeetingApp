# Backend Implementation Todo

## 1. Project Setup

- [ ] Initialize npm project (`npm init -y`)
- [ ] Install dependencies:
  - `express`, `better-sqlite3`, `socket.io`
  - `jsonwebtoken`, `zod`, `cors`, `helmet`
  - `express-rate-limit`, `pino`, `google-auth-library`
- [ ] Install dev dependencies:
  - `typescript`, `@types/*` packages
  - `vitest`, `supertest`, `tsx`, `nodemon`
- [ ] Create `tsconfig.json` (strict mode, paths)
- [ ] Create `.env.example`
- [ ] Create `vitest.config.ts`
- [ ] Add scripts: `dev`, `build`, `start`, `test`, `lint`

## 2. Core Server Setup

- [ ] Create `src/index.ts` — server entry point
  - [ ] Import and validate env vars
  - [ ] Create HTTP server
  - [ ] Initialize WebSocket server
  - [ ] Start listening on configured port
  - [ ] Handle graceful shutdown (SIGTERM/SIGINT)
- [ ] Create `src/app.ts` — Express app
  - [ ] Configure Helmet
  - [ ] Configure CORS
  - [ ] Configure JSON body parser
  - [ ] Configure rate limiter
  - [ ] Mount route handlers
  - [ ] Configure 404 handler
  - [ ] Configure global error handler
- [ ] Create `src/config/env.ts` — Zod env validation
- [ ] Create `src/utils/logger.ts` — Pino logger

## 3. Database Layer

- [ ] Create `src/db/connection.ts`
  - [ ] better-sqlite3 singleton
  - [ ] WAL mode enabled
  - [ ] Foreign keys enabled
- [ ] Create migration system
  - [ ] Migration runner class
  - [ ] Reads `src/db/migrations/*.sql` files
  - [ ] Tracks executed migrations in `_migrations` table
- [ ] Write migration `001_create_users.sql`
- [ ] Write migration `002_create_meetings.sql`
- [ ] Write migration `003_create_participants.sql`
- [ ] Write migration `004_create_refresh_tokens.sql`
- [ ] Create `src/db/seed.ts` — dev seed data

## 4. Type Definitions

- [ ] Create `src/types/models.ts`
  - [ ] `User` interface
  - [ ] `Meeting` interface
  - [ ] `Participant` interface
  - [ ] `RefreshToken` interface
- [ ] Create `src/types/express.d.ts`
  - [ ] Augment Express Request with `user` property
- [ ] Create `src/utils/errors.ts`
  - [ ] `AppError` base class
  - [ ] `NotFoundError`
  - [ ] `UnauthorizedError`
  - [ ] `ForbiddenError`
  - [ ] `ConflictError`
  - [ ] `ValidationError`

## 5. Authentication

- [ ] Create `src/utils/jwt.ts`
  - [ ] `generateAccessToken(user)` → JWT string
  - [ ] `verifyAccessToken(token)` → user payload
  - [ ] `generateRefreshToken()` → random hex string
- [ ] Create `src/services/authService.ts`
  - [ ] `getGoogleAuthUrl()` — generates Google OAuth URL
  - [ ] `handleGoogleCallback(code)` — exchanges code, returns tokens
  - [ ] `createOrUpdateUser(googleProfile)` — upserts user
  - [ ] `generateTokens(user)` — creates access + refresh tokens
  - [ ] `refreshAccessToken(refreshToken)` — validates and rotates
  - [ ] `revokeRefreshToken(token)` — deletes from DB
- [ ] Create `src/middleware/authenticate.ts`
  - [ ] Extract Bearer token from Authorization header
  - [ ] Verify JWT
  - [ ] Attach user to `req.user`
  - [ ] Return 401 on failure
- [ ] Create `src/middleware/optionalAuth.ts`
  - [ ] Same as authenticate but doesn't fail
  - [ ] Sets `req.user = null` if no/invalid token
- [ ] Create `src/middleware/validate.ts`
  - [ ] Factory function: `validate(schema: ZodSchema)`
  - [ ] Validates `req.body`, `req.query`, `req.params`
  - [ ] Returns 400 with structured errors
- [ ] Create `src/middleware/rateLimiter.ts`
  - [ ] General API limiter (100 req/min)
  - [ ] Auth endpoint limiter (10 req/min)
- [ ] Create `src/routes/auth.routes.ts`
  - [ ] `GET /auth/google`
  - [ ] `GET /auth/google/callback`
  - [ ] `POST /auth/refresh`
  - [ ] `GET /auth/me` (protected)

## 6. Meeting CRUD

- [ ] Create `src/services/meetingService.ts`
  - [ ] `createMeeting(data, hostId)` — create meeting
  - [ ] `getMeetings(filters, pagination)` — list meetings
  - [ ] `getMeetingById(id, userId?)` — get with optional join status
  - [ ] `updateMeeting(id, userId, data)` — host-only update
  - [ ] `deleteMeeting(id, userId)` — host-only delete
  - [ ] `joinMeeting(id, userId)` — add participant
  - [ ] `leaveMeeting(id, userId)` — remove participant
  - [ ] `getUserMeetings(userId)` — user's meetings
- [ ] Create Zod validation schemas
  - [ ] `createMeetingSchema`
  - [ ] `updateMeetingSchema`
  - [ ] `meetingQuerySchema`
- [ ] Create `src/routes/meeting.routes.ts`
  - [ ] `GET /meetings` (public, optional auth)
  - [ ] `POST /meetings` (protected)
  - [ ] `GET /meetings/:id` (public, optional auth)
  - [ ] `PUT /meetings/:id` (protected, host-only)
  - [ ] `DELETE /meetings/:id` (protected, host-only)
  - [ ] `POST /meetings/:id/join` (protected)
  - [ ] `POST /meetings/:id/leave` (protected)
  - [ ] `GET /users/me/meetings` (protected)

## 7. WebSocket

- [ ] Create `src/websocket/index.ts`
  - [ ] Socket.IO server setup with CORS
  - [ ] Auth middleware (optional, for JWT)
  - [ ] Connection handler
  - [ ] `meeting:subscribe` handler — joins room
  - [ ] `meeting:unsubscribe` handler — leaves room
  - [ ] Disconnect handler — cleanup
- [ ] Create `src/websocket/events.ts`
  - [ ] `emitMeetingCreated(meeting)` — broadcast to global
  - [ ] `emitMeetingUpdated(meeting)` — broadcast to meeting room
  - [ ] `emitMeetingDeleted(meetingId)` — broadcast to global + room
  - [ ] `emitMeetingCancelled(meetingId)` — broadcast to room
  - [ ] `emitParticipantJoined(meetingId, participant)` — to room
  - [ ] `emitParticipantLeft(meetingId, userId)` — to room
- [ ] Update meeting service to call WebSocket events
  - [ ] On create → `emitMeetingCreated`
  - [ ] On update → `emitMeetingUpdated`
  - [ ] On delete → `emitMeetingDeleted`
  - [ ] On join → `emitParticipantJoined` + `emitMeetingUpdated`
  - [ ] On leave → `emitParticipantLeft` + `emitMeetingUpdated`

## 8. Middleware & Error Handling

- [ ] Create `src/middleware/errorHandler.ts`
  - [ ] Catch `AppError` subclasses
  - [ ] Return structured error JSON
  - [ ] Log unexpected errors
  - [ ] Hide stack traces in production
- [ ] Create `src/routes/health.routes.ts`
  - [ ] `GET /health`
- [ ] Create `src/routes/index.ts`
  - [ ] Aggregate all route files
  - [ ] Apply prefixes

## 9. Testing

- [ ] Write auth service tests
- [ ] Write meeting service tests
- [ ] Write API endpoint tests (supertest)
  - [ ] Health endpoint
  - [ ] Auth endpoints (mock Google OAuth)
  - [ ] Meeting CRUD endpoints
  - [ ] Join/Leave endpoints
- [ ] Write WebSocket event tests
- [ ] Write validation error tests
- [ ] Write rate limiter tests

## 10. Final Polish

- [ ] Add compression middleware
- [ ] Add request ID middleware
- [ ] Add response time logging
- [ ] Create production Dockerfile (optional)
- [ ] Create `README.md` for backend
