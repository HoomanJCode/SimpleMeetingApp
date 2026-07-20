# Testing Implementation Todo

## 1. Project Setup

- [x] Create `tests/package.json`
- [x] Install Playwright
- [x] Create `playwright.config.ts`
  - [x] Configure base URL
  - [x] Configure browsers (Chromium)
  - [x] Configure test directory
  - [x] Configure web server (start backend + frontend)
- [x] Create `tests/tsconfig.json`

## 2. Test Fixtures & Helpers

- [x] Create `tests/fixtures/users.ts`
  - [x] Test user 1 (Alice)
  - [x] Test user 2 (Bob)
  - [x] Test user 3 (Charlie)
- [x] Create `tests/fixtures/meetings.ts`
  - [x] Valid meeting data
  - [x] Invalid meeting data (various error cases)
  - [x] Meeting with max capacity
- [x] Create `tests/helpers/api.ts`
  - [x] `getTokensFor(user)` — API helper
  - [x] `authedFetch(path, init)` — API helper
  - [x] `resetDb()` — tear down
- [x] Create `tests/helpers/auth.ts`
  - [x] `loginAs(page, user)` — authenticate via UI
  - [x] `getTestUser(like)` — resolve test user
- [x] Create `tests/helpers/setup.ts`
  - [x] Re-export `test`/`expect` with auto `resetDb` beforeEach

## 3. Authentication E2E Tests

- [x] `tests/e2e/auth.spec.ts`
  - [x] Unauthenticated user sees "Sign In with Google" button
  - [x] Authenticated user sees their avatar in header
  - [x] Protected routes redirect to home when not authenticated
  - [x] Auth callback page handles token in URL
  - [x] Sign out clears session and redirects to home

## 4. Meeting CRUD E2E Tests

- [x] `tests/e2e/meetings.spec.ts`
  - [x] Home page shows list of meetings
  - [x] Empty state shown when no meetings
  - [x] Search meetings by title works
  - [x] Authenticated user can create a meeting
  - [x] Meeting form validation shows errors for invalid data
  - [x] Created meeting appears in list
  - [x] Meeting detail page shows all information
  - [x] Host can edit own meeting
  - [x] Non-host cannot edit (403 on save)
  - [x] Host can delete own meeting (with confirmation)
  - [x] Deleted meeting disappears from list

## 5. Participation E2E Tests

- [x] `tests/e2e/participants.spec.ts`
  - [x] User can join an upcoming meeting
  - [x] Participant count updates after joining
  - [x] User can leave a meeting
  - [x] Participant count decreases after leaving
  - [x] Cannot join a full meeting
  - [x] Cannot join already-joined meeting (409)
  - [x] "My Meetings" page shows hosting and attending meetings
  - [x] Host cannot leave own meeting

## 6. Realtime E2E Tests

- [x] `tests/e2e/realtime.spec.ts`
  - [x] Two browser contexts: User A creates meeting, User B is on detail page
  - [x] When User B joins, User A sees participant count update
  - [x] When meeting is updated, all viewers see changes
  - [x] When meeting is deleted, viewers are notified
  - [x] Connection status indicator shows correct state

## 7. Backend Integration Tests (Vitest)

- [ ] `backend/tests/health.test.ts`
  - [ ] Health endpoint returns 200
  - [ ] Response includes timestamp and uptime
- [ ] `backend/tests/auth.test.ts`
  - [ ] POST /auth/refresh with valid token → 200
  - [ ] POST /auth/refresh with invalid token → 401
  - [ ] POST /auth/refresh with expired token → 401
  - [ ] GET /auth/me with valid JWT → 200 + user data
  - [ ] GET /auth/me without JWT → 401
- [ ] `backend/tests/meetings.test.ts`
  - [ ] GET /meetings → 200, paginated list
  - [ ] GET /meetings with search → filtered results
  - [ ] POST /meetings (authenticated) → 201
  - [ ] POST /meetings (unauthenticated) → 401
  - [ ] POST /meetings with invalid data → 400
  - [ ] GET /meetings/:id → 200
  - [ ] GET /meetings/:id (non-existent) → 404
  - [ ] PUT /meetings/:id (host) → 200
  - [ ] PUT /meetings/:id (non-host) → 403
  - [ ] DELETE /meetings/:id (host) → 204
  - [ ] DELETE /meetings/:id (non-host) → 403
- [ ] `backend/tests/participants.test.ts`
  - [ ] POST /meetings/:id/join → 200
  - [ ] POST /meetings/:id/join (already joined) → 409
  - [ ] POST /meetings/:id/join (full) → 409
  - [ ] POST /meetings/:id/leave → 200
  - [ ] POST /meetings/:id/leave (not participant) → 409
- [ ] `backend/tests/websocket.test.ts`
  - [ ] Connecting with valid token works
  - [ ] Subscribing to meeting room works
  - [ ] participant:joined event emitted on join
  - [ ] participant:left event emitted on leave
  - [ ] meeting:updated event emitted on update
  - [ ] meeting:deleted event emitted on delete

## 8. Frontend Unit Tests (Vitest)

- [ ] `frontend/src/components/ui/__tests__/Button.test.tsx`
  - [ ] Renders all variants
  - [ ] Handles click events
  - [ ] Shows loading state
  - [ ] Disabled prevents click
- [ ] `frontend/src/components/ui/__tests__/Input.test.tsx`
  - [ ] Renders with label
  - [ ] Shows error message
  - [ ] Handles user input
- [ ] `frontend/src/components/ui/__tests__/Modal.test.tsx`
  - [ ] Opens when trigger is clicked
  - [ ] Closes on backdrop click
  - [ ] Closes on Escape key
- [ ] `frontend/src/components/meeting/__tests__/MeetingCard.test.tsx`
  - [ ] Renders meeting data correctly
  - [ ] Shows participant count
  - [ ] Shows status badge
- [x] `frontend/src/hooks/__tests__/useRealtime.test.ts`
  - [x] Connects to WebSocket
  - [x] Falls back to polling on disconnect/connect_error
  - [x] Handles meeting update events
  - [x] Handles participant events
  - [x] Handles meeting:deleted event
- [x] `frontend/src/auth/__tests__/AuthContext.test.tsx`
  - [x] Provides user when logged in
  - [x] Provides null when logged out
  - [x] Login redirects to Google OAuth
  - [x] Logout clears state
  - [x] refreshUser swallows errors

## 9. Test Coverage Goals

| Area          | Target Coverage |
|---------------|-----------------|
| Backend API   | 90%+            |
| Backend services | 85%+          |
| Frontend components | 80%+      |
| Frontend hooks | 90%+           |
| E2E critical paths | 100%       |

## 10. CI Integration

- [x] GitHub Actions workflow for backend tests
- [x] GitHub Actions workflow for frontend tests
- [x] GitHub Actions workflow for E2E tests
- [x] Artifact upload for Playwright reports on failure
