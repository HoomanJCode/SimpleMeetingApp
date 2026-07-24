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

## 3. LoginModal input fields lose focus after every keystroke

**Where:** Sign In modal (LoginModal) — after signing out and trying to sign in again  
**What:** Typing in the email/password fields only allows one character, then focus is lost. Text also appears to go white/invisible.  
**Root cause:** The `Modal` component's `useEffect` depends on `handleKeyDown`, which depends on `onClose`. LoginModal's parent (Header) passes `onClose={() => setLoginModalOpen(false)}` — a new inline arrow function on every render. This causes `handleKeyDown` to be recreated, which triggers the Modal's effect cleanup (`previousFocusRef.current.focus()` — steals focus back to the trigger button). The Input and Modal also lack dark-mode CSS classes (`dark:bg-*`, `dark:text-*`), causing white-on-white text when the global theme is dark.  
**Files:**
- `frontend/src/components/ui/Modal.tsx` — unstable `handleKeyDown` callback, no dark mode classes  
- `frontend/src/components/ui/Input.tsx` — no `dark:` variants on base styles  
- `frontend/src/components/auth/LoginModal.tsx` — passes inline `onClose` arrow  
**Fix:**  
1. In `Modal.tsx`: store `onClose` in a ref and use it in `handleKeyDown` via the ref (removes `onClose` from the dependency array, making `handleKeyDown` stable).  
2. In `Modal.tsx` / `Input.tsx`: add `dark:` Tailwind variants (bg, text, border colors).

---

