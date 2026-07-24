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
