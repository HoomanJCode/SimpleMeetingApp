# Master Implementation Todo

This document tracks the overall project delivery milestones.

## Phase 1: Foundation (Week 1)

- [x] **1.1** Set up backend project (Node.js + Express + TypeScript)
  - [x] Initialize project with `package.json`, `tsconfig.json`
  - [x] Set up ESLint + Prettier
  - [x] Configure Vitest for unit tests
  - [x] Create `app.ts` with Express boilerplate
  - [x] Create `.env.example` with all required variables
  - [x] Implement health check endpoint (`GET /api/health`)
  - [x] Set up structured logging (Pino)

- [x] **1.2** Set up frontend project (React + TypeScript + Vite)
  - [x] Initialize project with Vite
  - [x] Configure TypeScript, ESLint, Prettier
  - [x] Set up Tailwind CSS
  - [x] Configure React Router
  - [x] Create basic layout (Header, Footer, Layout)

- [x] **1.3** Set up tests project
  - [x] Initialize Playwright
  - [x] Create `playwright.config.ts`
  - [ ] Create test fixtures and helpers _(pending — tracked in next milestone)_

## Phase 2: Database & Auth (Week 1-2)

- [x] **2.1** Database setup
  - [x] Implement SQLite connection singleton
  - [x] Create migration system
  - [x] Write migration 001: users table
  - [x] Write migration 002: meetings table
  - [x] Write migration 003: participants table
  - [x] Write migration 004: refresh_tokens table
  - [x] Add seed data for development

- [x] **2.2** Authentication backend
  - [ ] Set up Google OAuth credentials (Google Cloud Console) _(out-of-band user step)_
  - [x] Implement Google OAuth redirect (`GET /api/auth/google`)
  - [x] Implement OAuth callback (`GET /api/auth/google/callback`)
  - [x] Implement JWT generation and verification
  - [x] Implement refresh token logic (`POST /api/auth/refresh`)
  - [x] Implement `GET /api/auth/me` endpoint
  - [x] Implement `authenticate` middleware
  - [x] Implement `optionalAuth` middleware
  - [x] Implement `validate` middleware (Zod)
  - [x] Implement rate limiter middleware

- [x] **2.3** Authentication frontend
  - [x] Create `AuthContext` and `useAuth` hook
  - [x] Create "Sign in with Google" button
  - [x] Create `AuthCallbackPage` (handles redirect from OAuth)
  - [x] Create `ProtectedRoute` component
  - [x] Implement token storage (in-memory)
  - [x] Implement token refresh interceptor
  - [x] Implement logout functionality

## Phase 3: Meeting CRUD (Week 2)

- [x] **3.1** Meeting API endpoints
  - [x] `POST /api/meetings` — Create meeting
  - [x] `GET /api/meetings` — List meetings (paginated, search)
  - [x] `GET /api/meetings/:id` — Get meeting details
  - [x] `PUT /api/meetings/:id` — Update meeting (host only)
  - [x] `DELETE /api/meetings/:id` — Delete meeting (host only)

- [x] **3.2** Meeting frontend
  - [x] Create `MeetingCard` component
  - [x] Create `MeetingList` component
  - [x] Create `MeetingForm` component (create + edit)
  - [x] Create `MeetingDetail` component
  - [x] Create `ParticipantList` component
  - [x] Create `HomePage` (meeting list)
  - [x] Create `CreateMeetingPage`
  - [x] Create `EditMeetingPage`
  - [x] Create `MeetingDetailPage`
  - [x] Create `MyMeetingsPage`

## Phase 4: Participation (Week 2-3)

- [x] **4.1** Join/Leave API
  - [x] `POST /api/meetings/:id/join`
  - [x] `POST /api/meetings/:id/leave`
  - [x] `GET /api/users/me/meetings` _(served as `GET /api/meetings/my`)_

- [x] **4.2** Join/Leave frontend
  - [x] "Join Meeting" button on meeting detail
  - [x] "Leave Meeting" button for participants
  - [x] Participant count display
  - [x] Capacity indicator (e.g., "23/50 spots filled")
  - [x] Error handling (meeting full, already joined, etc.)

## Phase 5: Real-Time Communication (Week 3)

- [x] **5.1** WebSocket backend
  - [x] Set up Socket.IO server
  - [x] Implement authentication middleware for WebSocket
  - [x] Implement room management (`meeting:subscribe`, `meeting:unsubscribe`)
  - [x] Broadcast `meeting:created` on create
  - [x] Broadcast `participant:joined` on join
  - [x] Broadcast `participant:left` on leave
  - [x] Broadcast `meeting:updated` on update
  - [x] Broadcast `meeting:deleted` on delete
  - [x] Broadcast `meeting:cancelled` on cancel

- [x] **5.2** Real-time frontend
  - [x] Create `useRealtime` hook
  - [x] Implement Socket.IO client connection
  - [x] Implement polling fallback
  - [x] Create `ConnectionStatus` indicator component
  - [x] Wire real-time updates into meeting detail page
  - [x] Wire real-time updates into meeting list page

## Phase 6: UI Polish & Edge Cases (Week 3)

- [x] **6.1** UI polish
  - [x] Responsive design (mobile, tablet, desktop)
  - [x] Loading states (skeleton screens)
  - [x] Empty states (no meetings, no participants)
  - [x] Error states (API errors, network errors)
  - [x] Form validation feedback
  - [x] Toast notifications for actions
  - [x] Confirmation dialogs for destructive actions
  - [x] Animations and transitions

- [x] **6.2** Edge cases
  - [x] Cancelled meetings handling
  - [x] Past meetings handling
  - [x] Host leaving own meeting (should cancel, not leave)
  - [x] Token expiration during WebSocket connection
  - [x] Concurrent join attempts
  - [x] Browser back/forward navigation
  - [x] 404 page for invalid routes

## Phase 7: Testing (Week 3-4)

- [x] **7.1** Backend tests
  - [x] Health endpoint tests
  - [x] Auth flow tests (happy + error paths) _(partially via `backend/src/services/authService.test.ts`; full OAuth round-trip via `tests/`)_
  - [x] Meeting CRUD tests
  - [x] Join/Leave tests
  - [ ] WebSocket event tests _(pending)_
  - [x] Validation error tests
  - [x] Rate limiter tests

- [x] **7.2** Frontend tests
  - [x] Component unit tests (vitest)
  - [x] Auth flow tests
  - [x] API client mock tests

- [x] **7.3** E2E tests (Playwright)
  - [x] Full auth flow (login → home page)
  - [x] Create meeting flow
  - [x] Join meeting flow
  - [x] Leave meeting flow
  - [x] Edit meeting flow
  - [x] Delete meeting flow
  - [x] Real-time participant updates

## Phase 8: Production Readiness (Week 4)

- [x] **8.1** Production hardening
  - [x] Environment variable validation on startup
  - [x] Graceful shutdown (close DB, close WebSocket)
  - [x] Helmet security headers
  - [x] CORS configuration for production
  - [x] Rate limiting tuned for production
  - [ ] Backend serves frontend static build _(pending)_
  - [x] Compress responses (compression middleware)

- [x] **8.2** Documentation
  - [x] README with setup instructions _(root-level)_
  - [x] Backend README with API overview and env reference
  - [x] Environment variable reference _(see `backend/.env.example` and READMEs)_

- [x] **8.3** CI/CD
  - [x] GitHub Actions for linting
  - [x] GitHub Actions for tests
  - [x] Build pipeline
