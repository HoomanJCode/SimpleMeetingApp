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

