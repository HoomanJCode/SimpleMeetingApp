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

- [ ] Create `tests/fixtures/users.ts`
  - [ ] Test user 1 (Alice)
  - [ ] Test user 2 (Bob)
  - [ ] Test user 3 (Charlie)
- [ ] Create `tests/fixtures/meetings.ts`
  - [ ] Valid meeting data
  - [ ] Invalid meeting data (various error cases)
  - [ ] Meeting with max capacity
- [ ] Create `tests/helpers/api.ts`
  - [ ] `createTestMeeting(token)` — API helper
  - [ ] `joinTestMeeting(token, meetingId)` — API helper
  - [ ] `cleanupTestData()` — tear down
- [ ] Create `tests/helpers/auth.ts`
  - [ ] `loginAsTestUser(page, userIndex)` — authenticate via UI
  - [ ] `getTestJwt(userIndex)` — get token for API calls

## 3. Authentication E2E Tests

- [ ] `tests/e2e/auth.spec.ts`
  - [ ] Unauthenticated user sees "Sign In with Google" button
  - [ ] Authenticated user sees their avatar in header
  - [ ] Protected routes redirect to home when not authenticated
  - [ ] Auth callback page handles token in URL
  - [ ] Sign out clears session and redirects to home
  - [ ] Token refresh: expired token triggers refresh flow

## 4. Meeting CRUD E2E Tests

- [ ] `tests/e2e/meetings.spec.ts`
  - [ ] Home page shows list of meetings
  - [ ] Empty state shown when no meetings
  - [ ] Search meetings by title works
  - [ ] Pagination works correctly
  - [ ] Authenticated user can create a meeting
  - [ ] Meeting form validation shows errors for invalid data
  - [ ] Created meeting appears in list
  - [ ] Meeting detail page shows all information
  - [ ] Host can edit own meeting
  - [ ] Non-host sees "Edit" button hidden
  - [ ] Host can delete own meeting (with confirmation)
  - [ ] Deleted meeting disappears from list
  - [ ] 404 page for non-existent meeting

## 5. Participation E2E Tests

- [ ] `tests/e2e/participants.spec.ts`
  - [ ] User can join an upcoming meeting
  - [ ] Participant count updates after joining
  - [ ] "Join" button disabled after joining
  - [ ] User can leave a meeting
  - [ ] Participant count decreases after leaving
  - [ ] Cannot join a full meeting
  - [ ] Cannot join already-joined meeting
  - [ ] "My Meetings" page shows hosting and attending meetings
  - [ ] Host cannot leave own meeting (must cancel)

## 6. Realtime E2E Tests

- [ ] `tests/e2e/realtime.spec.ts`
  - [ ] Two browser contexts: User A creates meeting, User B is on detail page
  - [ ] When User B joins, User A sees participant count update
  - [ ] When meeting is updated, all viewers see changes
  - [ ] When meeting is deleted, viewers are notified
  - [ ] Connection status indicator shows correct state
  - [ ] Polling fallback works when WebSocket fails

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
- [ ] `frontend/src/hooks/__tests__/useRealtime.test.ts`
  - [ ] Connects to WebSocket
  - [ ] Falls back to polling on disconnect
  - [ ] Handles meeting update events
  - [ ] Handles participant events
- [ ] `frontend/src/auth/__tests__/AuthContext.test.tsx`
  - [ ] Provides user when logged in
  - [ ] Provides null when logged out
  - [ ] Login redirects to Google OAuth
  - [ ] Logout clears state

## 9. Test Coverage Goals

| Area          | Target Coverage |
|---------------|-----------------|
| Backend API   | 90%+            |
| Backend services | 85%+          |
| Frontend components | 80%+      |
| Frontend hooks | 90%+           |
| E2E critical paths | 100%       |

## 10. CI Integration (Optional)

- [ ] GitHub Actions workflow for backend tests
- [ ] GitHub Actions workflow for frontend tests
- [ ] GitHub Actions workflow for E2E tests
- [ ] Configure test reporting (JUnit XML)
- [ ] Configure coverage reporting
