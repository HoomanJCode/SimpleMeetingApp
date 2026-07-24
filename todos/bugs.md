# Bug Tracker

Reported bugs to fix. Keep adding as you find them.

---

## 1. Calendar icon invisible in dark mode

**Where:** Create/Edit Meeting form — the `datetime-local` input  
**What:** The browser-native calendar icon on `<input type="datetime-local">` renders black-on-dark in dark theme, making it nearly invisible.  
**Root cause:** The input has `dark:bg-gray-900` background but no `color-scheme: dark` CSS property. Browsers use the `color-scheme` property to decide whether to render native form controls (calendar icon, arrows) in light or dark variant.  
**File:** `frontend/src/components/meeting/MeetingForm.tsx` — the `#meeting-datetime` input.  
**Fix:** Add `[color-scheme:dark]` (via Tailwind's `dark:[color-scheme:dark]`) or set `color-scheme: dark` on the input when dark mode is active. Alternatively, apply it globally on `<html>` or `<body>`.

---

## 2. "Stay or Leave?" popup after successful meeting creation

**Where:** Create Meeting page — after clicking "Create Meeting" and the API succeeds  
**What:** The NavigationBlocker popup ("Unsaved Changes — Stay or Leave?") appears even though the meeting was created successfully and navigation to the detail page is intentional.  
**Root cause:** `isDirty` is `true` when `navigate()` fires because the form data hasn't been cleared yet. The router sees a dirty form and blocks navigation.  
**File:** `frontend/src/pages/CreateMeetingPage.tsx`  
**Fix:** In `handleSubmit`, set `isDirty` to `false` before calling `navigate()` — or clear dirty state immediately after a successful `create()` call.

---

