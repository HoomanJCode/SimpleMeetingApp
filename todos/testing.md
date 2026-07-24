# Testing Phase

Tasks related to testing the application before release.

---

## Backend Tests

- [ ] Run `npm test` in `backend/` — verify all unit tests pass (auth, meetings, participants, health, errors, JWT, rate limiter, websocket)
- [ ] Verify DB migrations run cleanly (`npm run migrate` from fresh DB)
- [ ] Test auth flow: register → login → access protected routes → refresh token → logout
- [ ] Test meeting CRUD: create → read → update → cancel (not delete)
- [ ] Test participant flow: join meeting → leave meeting → duplicate join error
- [ ] Test validation: invalid meeting dates, empty titles, missing fields → proper 400 errors
- [ ] Test rate limiting: rapid requests → 429 responses
- [ ] Test CORS: frontend origin allowed, other origins blocked

---

## Frontend Tests

- [ ] Run `npm test` in `frontend/` — verify all component/hook tests pass (AuthContext, Button, Input, Modal, MeetingCard, useDocumentTitle, useRealtime)
- [ ] Manual test: light/dark theme toggle — all components render correctly
- [ ] Manual test: responsive layout — pages render correctly on mobile/tablet/desktop
- [ ] Manual test: form validation — required fields, date picker, character limits
- [ ] Manual test: NavigationBlocker — "Stay or Leave?" modal when form is dirty, no modal after save
- [ ] Manual test: join/leave meeting — button toggles correctly based on membership
- [ ] Manual test: cancel meeting — shows cancelled status, remains visible
- [ ] Manual test: auth persistence — refresh on page reload, token refresh works
- [ ] Accessibility check: keyboard navigation, screen reader labels, focus management
- [ ] Browser compatibility: Chrome, Firefox, Edge

---

## E2E Tests (Playwright)

- [ ] Run `npx playwright test` in `tests/` — all specs pass
- [ ] Test: app loads, home page renders
- [ ] Test: user can register and login
- [ ] Test: user can create a meeting
- [ ] Test: user can view meeting details
- [ ] Test: user can join and leave a meeting
- [ ] Test: user can cancel a meeting (host)
- [ ] Test: realtime websocket updates on meeting changes

---

## Pre-Release Checklist

- [ ] All backend tests pass
- [ ] All frontend tests pass
- [ ] All E2E tests pass
- [ ] Build succeeds: `npm run build` in both backend and frontend
- [ ] `.env` template documented with all required vars
- [ ] No console errors/warnings in browser dev tools
- [ ] No hardcoded secrets in codebase
- [ ] README up to date with setup instructions
