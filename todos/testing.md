# Testing — Tags & Timeline Features

Checklist for verifying the just-implemented Tags (#5) and Event Timeline (#4) features before release.

---

## Tags — Backend

- [ ] `GET /api/tags` returns the 6 seeded default tags (id, name, color)
- [ ] `POST /api/meetings` accepts `tagIds` and echoes the assigned tags back
- [ ] `GET /api/meetings/:id` includes the meeting's `tags` array
- [ ] `GET /api/meetings` list responses include `tags` on every meeting
- [ ] `PUT /api/meetings/:id` replaces tags when `tagIds` is provided
- [ ] `PUT /api/meetings/:id` clears tags when `tagIds` is `[]`
- [ ] `GET /api/meetings?tagId=...` filters meetings by a single tag
- [ ] `GET /api/meetings/my` (hosting + attending) includes `tags`
- [ ] Unknown tag IDs are ignored (no 500 / FK error)
- [ ] Existing tests still pass: `cd backend && npm test`

---

## Tags — Frontend

- [ ] Create form shows the tag picker with all default tags
- [ ] Selecting/deselecting tags toggles chip state (solid vs outline)
- [ ] Created meeting shows its tags on the detail page
- [ ] Meeting cards show up to 3 tag chips (+N overflow)
- [ ] Edit form pre-populates the meeting's existing tags
- [ ] Saving edits updates the tags on the meeting
- [ ] Home page shows a tag filter bar; clicking a chip filters the list
- [ ] Clicking the active filter chip clears the filter
- [ ] Tag chips render correctly in both light and dark mode
- [ ] Calendar events show the first tag's color dot

---

## Timeline

- [ ] `/timeline` route loads and renders the timeline
- [ ] Header nav has a "Timeline" link (desktop and mobile)
- [ ] Meetings are sorted chronologically (oldest → newest)
- [ ] Month milestone labels appear when the month changes
- [ ] "Today" marker appears at the correct position (before first future meeting)
- [ ] Dots are colored by status (upcoming/ongoing/ended/cancelled)
- [ ] Meeting cards link to the correct detail page
- [ ] "All meetings" vs "My meetings" scope toggle works
- [ ] Status filter (All/Upcoming/Ongoing/Ended/Cancelled) works
- [ ] Empty state shows when no meetings match
- [ ] Loading spinner shows while fetching
- [ ] Timeline renders correctly in light and dark mode

---

## E2E (optional follow-up)

- [ ] Playwright spec: create meeting with tags → tags appear in list + detail
- [ ] Playwright spec: filter home list by tag chip
- [ ] Playwright spec: navigate to /timeline and see meetings on the line
