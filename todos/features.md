# Feature Requests

Requested features to implement. Keep adding as you think of them.

---

## 1. Replace Delete Meeting with Cancel Meeting

**Request:** Users should not be able to permanently delete meetings. Instead, hosts should be able to cancel a meeting, which sets its status to `cancelled` and keeps the meeting visible in the system.

**Scope:**
- **Backend:** Change the DELETE endpoint to POST /:id/cancel — sets `status = 'cancelled'` instead of deleting the row. Update `leaveMeeting` error message (currently says "Cancel or delete it instead").
- **Frontend MeetingDetail:** Replace "Delete" button with "Cancel Meeting" button (only for upcoming/ongoing meetings). Update confirmation modal text to explain cancellation vs deletion.
- **Frontend EditMeetingPage:** Replace "Delete Meeting" button with "Cancel Meeting" button. Same modal changes.
- **API client:** Rename `deleteMeeting()` to `cancelMeeting()`, change from DELETE to POST.
- **Hooks:** Rename `useDeleteMeeting` to `useCancelMeeting`.

**Files:**
- `backend/src/services/meetingService.ts` — change `deleteMeeting` to `cancelMeeting` (UPDATE status, don't DELETE)
- `backend/src/routes/meeting.routes.ts` — change DELETE /:id → POST /:id/cancel
- `frontend/src/api/meetings.ts` — rename and rewire
- `frontend/src/hooks/useMeetings.ts` — rename hook
- `frontend/src/components/meeting/MeetingDetail.tsx` — button text, modal text
- `frontend/src/pages/EditMeetingPage.tsx` — button text, modal text
- `frontend/src/pages/MeetingDetailPage.tsx` — update handler

---

## 2. Add Cover Photo and Photo Gallery to Meetings

**Request:** Meetings should support a cover photo (single image) and a photo gallery (multiple images) to make events more visually engaging.

**Scope:**
- **Database:** Add migration for `cover_photo_url` (TEXT, nullable) on meetings table and a new `meeting_photos` table (id, meeting_id FK, url TEXT, created_at).
- **Backend types:** Extend `Meeting` model with `coverPhotoUrl?: string` and `photos?: MeetingPhoto[]`.
- **Backend service:** Extend `createMeeting` and `updateMeeting` to accept coverPhotoUrl and photos. Add endpoints: `POST /:id/photos` (upload), `DELETE /:id/photos/:photoId` (remove).
- **Backend middleware/routes:** Image upload handling (multer or similar), file storage (local disk or cloud like S3/Cloudinary).
- **Frontend MeetingForm:** Add cover photo upload field (drag-and-drop or file picker with preview) and photo gallery multi-upload.
- **Frontend MeetingCard:** Show cover photo thumbnail on meeting cards in the list.
- **Frontend MeetingDetail:** Show full cover photo and photo gallery grid with lightbox.
- **Frontend types:** Extend `Meeting` type with `coverPhotoUrl` and `photos[]`.

**Files:**
- `backend/src/db/migrations/` — new migration for cover_photo and meeting_photos table
- `backend/src/types/models.ts` — MeetingPhoto interface, extend Meeting
- `backend/src/services/meetingService.ts` — accept/return photo fields
- `backend/src/services/meetingSchemas.ts` — validation for photo uploads
- `backend/src/routes/meeting.routes.ts` — new upload/delete photo endpoints
- `frontend/src/types/index.ts` — extend Meeting type
- `frontend/src/api/meetings.ts` — upload/delete photo API calls
- `frontend/src/components/meeting/MeetingForm.tsx` — photo upload UI
- `frontend/src/components/meeting/MeetingCard.tsx` — cover photo thumbnail
- `frontend/src/components/meeting/MeetingDetail.tsx` — photo gallery display

**Open questions:**
- File storage: local disk (simpler, needs .gitignore for uploads/) vs cloud (S3, Cloudinary)?
- Max file size / allowed formats?
- Max number of photos per meeting?

---

## 3. Calendar View for Meetings

**Request:** A calendar page that displays meetings as events on a visual calendar, so users can see their schedule at a glance.

**Scope:**
- **Frontend page:** New `CalendarPage.tsx` at `/calendar` route with a month/week view calendar component.
- **Calendar library:** Integrate a React calendar library (e.g. `react-big-calendar`, `fullcalendar`, or a lighter option like `react-day-picker` with custom month grid).
- **Data:** Fetch meetings from the existing `GET /api/meetings` endpoint. Filter to show upcoming meetings by default.
- **UI:** Each meeting appears as an event dot/badge on its date. Clicking opens a popover or navigates to the meeting detail page.
- **Navigation:** Add "Calendar" link to the header/nav bar.
- **Responsive:** Mobile-friendly — month view on desktop, agenda/list view on small screens.
- **Theming:** Support light/dark theme matching the existing ThemeProvider.

**Files:**
- `frontend/src/pages/CalendarPage.tsx` — new calendar page component
- `frontend/src/App.tsx` — add `/calendar` route
- `frontend/src/components/layout/Header.tsx` — add Calendar nav link
- `frontend/src/types/index.ts` — may need CalendarEvent adapter type

**Open questions:**
- Which calendar library? `react-big-calendar` (full-featured, heavier) vs `react-day-picker` v9 (lighter, modern, month grid) vs `fullcalendar` (most features, largest bundle)?
- Month view only, or also week/day views?
- Show all meetings or only user's joined/owned meetings?
- Color-code by meeting status (upcoming/ongoing/cancelled)?

---

## 4. Event Timeline View

**Request:** A scrolling horizontal/vertical timeline that shows events along a chronological line. Users scroll through time and see meeting cards pop up along the line at their corresponding dates.

**Scope:**
- **Frontend page:** New `TimelinePage.tsx` at `/timeline` route with an interactive timeline component.
- **Layout:** A central timeline line (vertical on desktop, could be horizontal on mobile) with event cards branching off at their date positions. Scrolling moves along the timeline; events animate into view.
- **Data:** Fetch meetings from `GET /api/meetings`. Sort chronologically.
- **UI details:** Each event appears as a card/dot connected to the timeline by a line. Card shows title, date/time, status badge. Clicking navigates to meeting detail.
- **Visual design:** Smooth scroll animations, parallax-like reveal as events enter viewport. Milestone markers for months/years along the line. "You are here" indicator for current date.
- **Filters:** Toggle to show all meetings or only user's meetings. Filter by status (upcoming/ongoing/past/cancelled).
- **Navigation:** Add "Timeline" link to the header/nav bar.
- **Theming:** Full light/dark support matching ThemeProvider.
- **Responsive:** Vertical timeline on desktop, compact horizontal scroll on mobile.

**Files:**
- `frontend/src/pages/TimelinePage.tsx` — new timeline page
- `frontend/src/App.tsx` — add `/timeline` route
- `frontend/src/components/layout/Header.tsx` — add Timeline nav link
- `frontend/src/components/meeting/` — may extract a reusable `TimelineCard` component

**Open questions:**
- Build custom with CSS/Framer Motion or use a library like `react-chrono`?
- Vertical scroll (more traditional) or horizontal scroll (more modern)?
- Infinite scroll/pagination for large meeting sets?

---

## 5. Tags / Labels for Events

**Request:** Allow organizers to add tags/labels to meetings (e.g. "workshop", "social", "urgent", "remote") so users can categorize, filter, and quickly identify event types.

**Scope:**
- **Database:** New `tags` table (id, name TEXT UNIQUE, color TEXT) and `meeting_tags` junction table (meeting_id FK, tag_id FK). Seed a set of default tags.
- **Backend types:** Add `Tag` interface (`id`, `name`, `color`). Extend `Meeting` to include `tags?: Tag[]`.
- **Backend API:** `GET /api/tags` — list available tags. Extend `createMeeting`/`updateMeeting` to accept `tagIds`. Include tags in meeting responses.
- **Frontend MeetingForm:** Multi-select tag picker (chips with colors) when creating/editing a meeting.
- **Frontend MeetingCard:** Show tag chips on meeting cards in the list view.
- **Frontend MeetingDetail:** Show tag chips on the detail page.
- **Frontend MeetingList:** Filter meetings by tag (click a tag chip to filter).
- **Calendar & Timeline:** Show tag colors on calendar events and timeline cards.

**Files:**
- `backend/src/db/migrations/` — new migration for tags + meeting_tags tables
- `backend/src/types/models.ts` — Tag interface, extend Meeting
- `backend/src/services/meetingService.ts` — accept tagIds, join tags in queries
- `backend/src/services/meetingSchemas.ts` — tagIds validation
- `backend/src/routes/meeting.routes.ts` — GET /tags endpoint, tagIds in create/update
- `frontend/src/types/index.ts` — Tag type, extend Meeting
- `frontend/src/api/meetings.ts` — fetchTags(), pass tagIds in create/update
- `frontend/src/components/meeting/MeetingForm.tsx` — tag picker with colored chips
- `frontend/src/components/meeting/MeetingCard.tsx` — tag chips display
- `frontend/src/components/meeting/MeetingDetail.tsx` — tag chips display
- `frontend/src/components/meeting/MeetingList.tsx` — tag filter

**Open questions:**
- Predefined tags (admin-managed) vs user-created tags?
- How many tags per meeting (max)?
- Tag colors: predefined palette or custom hex?
