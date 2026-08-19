# Testing — Tags & Timeline Features

Checklist for verifying the just-implemented Tags (#5) and Event Timeline (#4) features before release.

> **Legend:** `[x]` = verified in this sandbox (live API tests and/or vitest). `[ ]` = not verifiable here (needs a browser, dark-mode rendering, or a normal machine for the backend suite).

---

## Tags — Backend

- [x] `GET /api/tags` returns the 6 seeded default tags (id, name, color)
- [x] `POST /api/meetings` accepts `tagIds` and echoes the assigned tags back
- [x] `GET /api/meetings/:id` includes the meeting's `tags` array
- [x] `GET /api/meetings` list responses include `tags` on every meeting
- [x] `PUT /api/meetings/:id` replaces tags when `tagIds` is provided
- [x] `PUT /api/meetings/:id` clears tags when `tagIds` is `[]`
- [x] `GET /api/meetings?tagId=...` filters meetings by a single tag
- [x] `GET /api/meetings/my` (hosting + attending) includes `tags`
- [x] Unknown tag IDs are ignored (no 500 / FK error) — **was a bug, fixed + regression test added**
- [ ] Existing tests still pass: `cd backend && npm test` — **cannot run in sandbox** (Vitest 4 / rolldown native binding broken on Android); run on a normal machine

---

## Tags — Frontend

- [x] Create form shows the tag picker with all default tags
- [x] Selecting/deselecting tags toggles chip state (solid vs outline)
- [x] Created meeting shows its tags on the detail page
- [x] Meeting cards show up to 3 tag chips (+N overflow)
- [x] Edit form pre-populates the meeting's existing tags
- [x] Saving edits updates the tags on the meeting
- [x] Home page shows a tag filter bar; clicking a chip filters the list
- [x] Clicking the active filter chip clears the filter
- [ ] Tag chips render correctly in both light and dark mode — **needs a browser**
- [x] Calendar events show the first tag's color dot

---

## Timeline

- [x] `/timeline` route loads and renders the timeline
- [x] Header nav has a "Timeline" link (desktop and mobile)
- [x] Meetings are sorted chronologically (oldest → newest)
- [x] Month milestone labels appear when the month changes
- [x] "Today" marker appears at the correct position (before first future meeting)
- [x] Dots are colored by status (upcoming/ongoing/ended/cancelled)
- [x] Meeting cards link to the correct detail page
- [x] "All meetings" vs "My meetings" scope toggle works
- [x] Status filter (All/Upcoming/Ongoing/Ended/Cancelled) works
- [x] Empty state shows when no meetings match — **was a bug, fixed**
- [x] Loading spinner shows while fetching
- [ ] Timeline renders correctly in light and dark mode — **needs a browser**

---

## E2E (needs a browser — not possible in this sandbox)

- [ ] Playwright spec: create meeting with tags → tags appear in list + detail
- [ ] Playwright spec: filter home list by tag chip
- [ ] Playwright spec: navigate to /timeline and see meetings on the line
