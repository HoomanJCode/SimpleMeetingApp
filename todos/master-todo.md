# Master Implementation Todo

This document tracks the overall project delivery milestones.

## Phase 1: Foundation (Week 1)

- [ ] **1.1** Set up backend project (Node.js + Express + TypeScript)
  - [ ] Initialize project with `package.json`, `tsconfig.json`
  - [ ] Set up ESLint + Prettier
  - [ ] Configure Vitest for unit tests
  - [ ] Create `app.ts` with Express boilerplate
  - [ ] Create `.env.example` with all required variables
  - [ ] Implement health check endpoint (`GET /api/health`)
  - [ ] Set up structured logging (Pino)

- [ ] **1.2** Set up frontend project (React + TypeScript + Vite)
  - [ ] Initialize project with Vite
  - [ ] Configure TypeScript, ESLint, Prettier
  - [ ] Set up Tailwind CSS
  - [ ] Configure React Router
  - [ ] Create basic layout (Header, Footer, Layout)

- [ ] **1.3** Set up tests project
  - [ ] Initialize Playwright
  - [ ] Create `playwright.config.ts`
  - [ ] Create test fixtures and helpers

## Phase 2: Database & Auth (Week 1-2)

- [ ] **2.1** Database setup
  - [ ] Implement SQLite connection singleton
  - [ ] Create migration system
  - [ ] Write migration 001: users table
  - [ ] Write migration 002: meetings table
  - [ ] Write migration 003: participants table
  - [ ] Write migration 004: refresh_tokens table
  - [ ] Add seed data for development

- [ ] **2.2** Authentication backend
  - [ ] Set up Google OAuth credentials (Google Cloud Console)
  - [ ] Implement Google OAuth redirect (`GET /api/auth/google`)
  - [ ] Implement OAuth callback (`GET /api/auth/google/callback`)
  - [ ] Implement JWT generation and verification
  - [ ] Implement refresh token logic (`POST /api/auth/refresh`)
  - [ ] Implement `GET /api/auth/me` endpoint
  - [ ] Implement `authenticate` middleware
  - [ ] Implement `optionalAuth` middleware
  - [ ] Implement `validate` middleware (Zod)
  - [ ] Implement rate limiter middleware

- [ ] **2.3** Authentication frontend
  - [ ] Create `AuthContext` and `useAuth` hook
  - [ ] Create "Sign in with Google" button
  - [ ] Create `AuthCallbackPage` (handles redirect from OAuth)
  - [ ] Create `ProtectedRoute` component
  - [ ] Implement token storage (in-memory)
  - [ ] Implement token refresh interceptor
  - [ ] Implement logout functionality

## Phase 3: Meeting CRUD (Week 2)

- [ ] **3.1** Meeting API endpoints
  - [ ] `POST /api/meetings` — Create meeting
  - [ ] `GET /api/meetings` — List meetings (paginated, search)
  - [ ] `GET /api/meetings/:id` — Get meeting details
  - [ ] `PUT /api/meetings/:id` — Update meeting (host only)
  - [ ] `DELETE /api/meetings/:id` — Delete meeting (host only)

- [ ] **3.2** Meeting frontend
  - [ ] Create `MeetingCard` component
  - [ ] Create `MeetingList` component
  - [ ] Create `MeetingForm` component (create + edit)
  - [ ] Create `MeetingDetail` component
  - [ ] Create `ParticipantList` component
  - [ ] Create `HomePage` (meeting list)
  - [ ] Create `CreateMeetingPage`
  - [ ] Create `EditMeetingPage`
  - [ ] Create `MeetingDetailPage`
  - [ ] Create `MyMeetingsPage`

## Phase 4: Participation (Week 2-3)

- [ ] **4.1** Join/Leave API
  - [ ] `POST /api/meetings/:id/join`
  - [ ] `POST /api/meetings/:id/leave`
  - [ ] `GET /api/users/me/meetings`

- [ ] **4.2** Join/Leave frontend
  - [ ] "Join Meeting" button on meeting detail
  - [ ] "Leave Meeting" button for participants
  - [ ] Participant count display
  - [ ] Capacity indicator (e.g., "23/50 spots filled")
  - [ ] Error handling (meeting full, already joined, etc.)

## Phase 5: Real-Time Communication (Week 3)

- [ ] **5.1** WebSocket backend
  - [ ] Set up Socket.IO server
  - [ ] Implement authentication middleware for WebSocket
  - [ ] Implement room management (`meeting:subscribe`, `meeting:unsubscribe`)
  - [ ] Broadcast `meeting:created` on create
  - [ ] Broadcast `participant:joined` on join
  - [ ] Broadcast `participant:left` on leave
  - [ ] Broadcast `meeting:updated` on update
  - [ ] Broadcast `meeting:deleted` on delete
  - [ ] Broadcast `meeting:cancelled` on cancel

- [ ] **5.2** Real-time frontend
  - [ ] Create `useRealtime` hook
  - [ ] Implement Socket.IO client connection
  - [ ] Implement polling fallback
  - [ ] Create `ConnectionStatus` indicator component
  - [ ] Wire real-time updates into meeting detail page
  - [ ] Wire real-time updates into meeting list page

## Phase 6: UI Polish & Edge Cases (Week 3)

- [ ] **6.1** UI polish
  - [ ] Responsive design (mobile, tablet, desktop)
  - [ ] Loading states (skeleton screens)
  - [ ] Empty states (no meetings, no participants)
  - [ ] Error states (API errors, network errors)
  - [ ] Form validation feedback
  - [ ] Toast notifications for actions
  - [ ] Confirmation dialogs for destructive actions
  - [ ] Animations and transitions

- [ ] **6.2** Edge cases
  - [ ] Cancelled meetings handling
  - [ ] Past meetings handling
  - [ ] Host leaving own meeting (should cancel, not leave)
  - [ ] Token expiration during WebSocket connection
  - [ ] Concurrent join attempts
  - [ ] Browser back/forward navigation
  - [ ] 404 page for invalid routes

## Phase 7: Testing (Week 3-4)

- [ ] **7.1** Backend tests
  - [ ] Health endpoint tests
  - [ ] Auth flow tests (happy + error paths)
  - [ ] Meeting CRUD tests
  - [ ] Join/Leave tests
  - [ ] WebSocket event tests
  - [ ] Validation error tests
  - [ ] Rate limiter tests

- [ ] **7.2** Frontend tests
  - [ ] Component unit tests (vitest)
  - [ ] Auth flow tests
  - [ ] API client mock tests

- [ ] **7.3** E2E tests (Playwright)
  - [ ] Full auth flow (login → home page)
  - [ ] Create meeting flow
  - [ ] Join meeting flow
  - [ ] Leave meeting flow
  - [ ] Edit meeting flow
  - [ ] Delete meeting flow
  - [ ] Real-time participant updates

## Phase 8: Production Readiness (Week 4)

- [ ] **8.1** Production hardening
  - [ ] Environment variable validation on startup
  - [ ] Graceful shutdown (close DB, close WebSocket)
  - [ ] Helmet security headers
  - [ ] CORS configuration for production
  - [ ] Rate limiting tuned for production
  - [ ] Backend serves frontend static build
  - [ ] Compress responses (compression middleware)

- [ ] **8.2** Documentation
  - [ ] README with setup instructions
  - [ ] API documentation (OpenAPI/Swagger or in docs)
  - [ ] Environment variable reference

- [ ] **8.3** CI/CD (nice-to-have)
  - [ ] GitHub Actions for linting
  - [ ] GitHub Actions for tests
  - [ ] Build pipeline
