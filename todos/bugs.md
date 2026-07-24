# Bug Tracker

Report bugs here with a brief description. I'll add root cause analysis and file paths.

---

## ✅ 1. Calendar icon invisible in dark mode

**Where:** Create/Edit Meeting form — the `datetime-local` input  
**What:** The browser-native calendar icon on `<input type="datetime-local">` rendered black-on-dark in dark theme, making it nearly invisible.  
**Root cause:** The input had `dark:bg-gray-900` background but no `color-scheme: dark` CSS property. Browsers use `color-scheme` to decide whether to render native form controls in light or dark variant.  
**Fix:** Added `dark:[color-scheme:dark]` Tailwind arbitrary property to the datetime-local input.  
**Commit:** `070c296`

---

## ✅ 2. "Stay or Leave?" popup after successful meeting creation

**Where:** Create Meeting page — after clicking "Create Meeting" and the API succeeds  
**What:** The NavigationBlocker popup appeared even though the meeting was created successfully.  
**Root cause:** `navigate()` is synchronous — it checks `useBlocker` callbacks before React re-renders the NavigationBlocker with the new `when=false` prop. Setting `isDirty=false` before `navigate()` wasn't enough.  
**Fix:** Deferred navigation with `setTimeout(() => navigate(...), 0)` + `submittedRef` guard + `setIsDirty(false)`.  
**Commit:** `55b69b3`

---

## ✅ 3. LoginModal input fields lose focus after every keystroke

**Where:** Sign In modal — after signing out and trying to sign in again  
**What:** Typing in the email/password fields only allowed one character, then focus was lost. Text appeared white/invisible.  
**Root cause:** Modal's `handleKeyDown` depended on `onClose` (inline arrow function, recreated every render). This triggered `useEffect` re-runs whose cleanup stole focus via `previousFocusRef.current.focus()`. Modal and Input also lacked dark-mode CSS.  
**Fix:** Stored `onClose` in a ref for stable `handleKeyDown`. Added `dark:` variants to Modal and Input components.  
**Commit:** `a05b06e`

---

## ✅ 4. Footer leaks tech stack

**Where:** Footer component  
**What:** "Built with React, Express & SQLite" reveals private project info.  
**Fix:** Removed tech stack disclosure; footer now just shows "© {year} IrMeetingApp".  
**Commit:** `90c2bef`

---

## ✅ 5. "Join Meeting" button shows after sign out/in for already-joined meetings

**Where:** Meeting detail page — after signing out and signing back in  
**What:** The "Join Meeting" button appeared instead of "Leave Meeting" for meetings the user had already joined. Clicking join caused a "Already joined" error.  
**Root cause:** `useMeeting` hook's `useEffect` only depended on `id`. When the user signed out/in, the hook didn't refetch. Additionally, React effects fire bottom-up, so `MeetingDetailPage`'s effect ran BEFORE `AuthProvider` configured the API client — the first `GET /meetings/:id` happened without a Bearer token, returning `isJoined=false`.  
**Fix:** Added optional `userId` parameter to `useMeeting`, included in dependency array. `MeetingDetailPage` passes `user?.id`. When userId changes (null → actual ID after login), the hook refetches with auth.  
**Commit:** `0d13f5d`

---

## ✅ 6. "Stay or Leave?" popup after saving edits (Edit Meeting)

**Where:** Edit Meeting page — after clicking "Save Changes" and the API succeeds  
**What:** Same NavigationBlocker bug as #2, but on the Edit page.  
**Fix:** Applied the same three-guard fix: `submittedRef`, `setIsDirty(false)`, `setTimeout(0)` deferred navigation.  
**Commit:** `12fe506`

---
