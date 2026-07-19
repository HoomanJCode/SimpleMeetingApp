# Frontend Implementation Todo

## 1. Project Setup

- [x] Create Vite + React + TypeScript project
- [x] Install dependencies:
  - `react`, `react-dom`, `react-router-dom`, `socket.io-client`
- [x] Install dev dependencies:
  - `typescript`, `@types/react`, `@types/react-dom`
  - `vite`, `@vitejs/plugin-react`
  - `tailwindcss`, `postcss`, `autoprefixer`
  - `vitest`, `@testing-library/react`, `jsdom`
- [x] Configure `tailwind.config.js`
- [x] Configure `postcss.config.js`
- [x] Configure `vite.config.ts` (proxy API requests to backend)
- [x] Configure `tsconfig.json`
- [x] Add scripts: `dev`, `build`, `preview`, `test`, `lint`

## 2. Core App Structure

- [x] Create `src/main.tsx` — React DOM render with providers
- [x] Create `src/index.css` — Tailwind directives + global styles
- [x] Create `src/App.tsx` — Router setup
  - [x] `/` → HomePage
  - [x] `/meetings/new` → CreateMeetingPage (protected)
  - [x] `/meetings/:id` → MeetingDetailPage
  - [x] `/meetings/:id/edit` → EditMeetingPage (protected)
  - [x] `/my-meetings` → MyMeetingsPage (protected)
  - [x] `/auth/callback` → AuthCallbackPage
  - [x] `*` → NotFoundPage
- [x] Create `src/types/index.ts` — shared TypeScript types

## 3. API Client

- [x] Create `src/api/client.ts`
  - [x] Fetch wrapper with base URL
  - [x] Request interceptor: adds JWT to Authorization header
  - [x] Response interceptor: handles 401 → refresh token → retry
  - [x] Error normalization
- [x] Create `src/api/auth.ts`
  - [x] `getCurrentUser()` → GET /api/auth/me
  - [x] `refreshToken(refreshToken)` → POST /api/auth/refresh
- [x] Create `src/api/meetings.ts`
  - [x] `getMeetings(params)` → GET /api/meetings
  - [x] `getMeeting(id)` → GET /api/meetings/:id
  - [x] `createMeeting(data)` → POST /api/meetings
  - [x] `updateMeeting(id, data)` → PUT /api/meetings/:id
  - [x] `deleteMeeting(id)` → DELETE /api/meetings/:id
  - [x] `joinMeeting(id)` → POST /api/meetings/:id/join
  - [x] `leaveMeeting(id)` → POST /api/meetings/:id/leave
  - [x] `getMyMeetings()` → GET /meetings/my

## 4. Authentication (Frontend)

- [x] Create `src/auth/AuthContext.tsx`
  - [x] `user: User | null`
  - [x] `isLoading: boolean`
  - [x] `login()` — redirect to `/api/auth/google`
  - [x] `logout()` — clear tokens, redirect home
  - [x] `getToken()` — return current access token
  - [x] API client wiring with `configureApiClient`
  - [x] Token refresh on 401 with automatic retry
- [x] Create `src/auth/useAuth.ts` — convenience hook
- [x] Create `src/auth/ProtectedRoute.tsx`
  - [x] Redirects to home with message if not authenticated
  - [x] Shows spinner while auth state is loading
- [x] Create `src/pages/AuthCallbackPage.tsx`
  - [x] Extracts `token` and `refreshToken` from URL query
  - [x] Stores tokens in memory via AuthContext
  - [x] Redirects to home

## 5. UI Components

- [x] Create `src/components/ui/Button.tsx`
  - [x] Variants: `primary`, `secondary`, `danger`, `ghost`
  - [x] Sizes: `sm`, `md`, `lg`
  - [x] Loading state with spinner
  - [x] Disabled state
- [x] Create `src/components/ui/Input.tsx`
  - [x] Text, textarea, number variants
  - [x] Label, error message, helper text
  - [x] Focus and error styles
- [x] Create `src/components/ui/Modal.tsx`
  - [x] Overlay with backdrop
  - [x] Title, body, footer slots
  - [x] Close on Escape and backdrop click
- [x] Create `src/components/ui/Spinner.tsx`
  - [x] Sizes: `sm`, `md`, `lg`
- [x] Create `src/components/ui/Avatar.tsx`
  - [x] Image (with fallback initials)
  - [x] Sizes: `sm`, `md`, `lg`
- [x] Create `src/components/ui/Badge.tsx`
  - [x] Variants: `success`, `warning`, `error`, `info`
- [x] Create `src/components/ui/Toast.tsx`
  - [x] Success, error, warning, info variants
  - [x] Auto-dismiss with configurable duration
  - [x] Toast container with stacking

## 6. Layout Components

- [x] Create `src/components/layout/Header.tsx`
  - [x] App logo/name (links to home)
  - [x] Navigation: "My Meetings" (if authenticated)
  - [x] "Create Meeting" button (if authenticated)
  - [x] User avatar + dropdown menu (if authenticated)
  - [x] "Sign In with Google" button (if not authenticated)
  - [x] Mobile hamburger menu
- [x] Create `src/components/layout/Footer.tsx`
- [x] Create `src/components/layout/Layout.tsx`
  - [x] Header + main content + Footer
  - [x] Toast container

## 7. Meeting Components

- [x] Create `src/components/meeting/MeetingCard.tsx`
  - [x] Title, date/time, location
  - [x] Participant count (e.g., "12/30 spots")
  - [x] Host avatar + name
  - [x] Status badge (upcoming, ongoing, ended, cancelled)
  - [x] Hover effect with shadow
  - [x] Click navigates to meeting detail
- [x] Create `src/components/meeting/MeetingList.tsx`
  - [x] Grid layout (responsive: 1 col mobile, 2 tablet, 3 desktop)
  - [x] Search input (debounced)
  - [x] Empty state illustration
  - [x] Loading skeleton grid
  - [x] Pagination or infinite scroll
- [x] Create `src/components/meeting/MeetingForm.tsx`
  - [x] Title input (text)
  - [x] Description input (textarea)
  - [x] Date/Time picker
  - [x] Location input (text)
  - [x] Capacity input (number, min=2)
  - [x] Validation: inline errors, disabled submit until valid
  - [x] Submit button with loading state
  - [x] Cancel button
- [x] Create `src/components/meeting/MeetingDetail.tsx`
  - [x] Meeting title, description, date/time, location
  - [x] Host info (avatar, name)
  - [x] Capacity indicator (progress bar)
  - [x] "Join" / "Leave" / "Edit" / "Delete" buttons (context-dependent)
  - [x] Join button disabled when full
  - [x] Status badge
  - [x] Connection status indicator (live vs polling)
- [x] Create `src/components/meeting/ParticipantList.tsx`
  - [x] Grid of avatars with names
  - [x] "X more" overflow for large lists
  - [x] Host badge on host
  - [x] Join date tooltip
- [x] Create `src/components/meeting/ConnectionStatus.tsx`
  - [x] Green dot + "Live" when WebSocket connected
  - [x] Yellow dot + "Syncing" when polling
  - [x] Red dot + "Offline" when disconnected
  - [x] Subtle placement (bottom corner of meeting detail)

## 8. Pages

- [x] Create `src/pages/HomePage.tsx`
  - [x] Hero section (or simple title + subtitle)
  - [x] Search bar
  - [x] MeetingList
  - [x] "Create Meeting" CTA for authenticated users
- [x] Create `src/pages/CreateMeetingPage.tsx`
  - [x] Page title: "Create a New Meeting"
  - [x] MeetingForm component
  - [x] Redirect to meeting detail on success
  - [x] Toast notification on success/error
- [x] Create `src/pages/EditMeetingPage.tsx`
  - [x] Page title: "Edit Meeting"
  - [x] MeetingForm pre-filled with existing data
  - [x] "Delete Meeting" button with confirmation modal
  - [x] Redirect to meeting detail on success
- [x] Create `src/pages/MeetingDetailPage.tsx`
  - [x] MeetingDetail with real-time updates
  - [x] ParticipantList
  - [x] useRealtime hook for live updates
  - [x] 404 state if meeting not found
  - [x] Back button
- [x] Create `src/pages/MyMeetingsPage.tsx`
  - [x] Tabs: "Hosting" | "Attending"
  - [x] MeetingList for each tab
  - [x] Empty state when no meetings

## 9. Real-Time Integration

- [x] Create `src/hooks/useRealtime.ts`

## 10. Data Hooks

- [x] Create `src/hooks/useMeetings.ts`

## 11. Polish & Edge Cases

- [x] Responsive design for all pages (mobile-first)
- [x] Dark mode (using Tailwind dark: classes + system preference)
- [x] Skeleton loading states
- [x] Empty states with illustrations and CTAs
- [x] Error boundaries for critical sections
- [x] 404 page with "Back to Home" link
- [x] Form dirty state warnings (prevent accidental navigation)
- [x] Toast notifications for all mutations
- [x] Confirmation modals for delete, leave
- [x] Keyboard accessibility (tab navigation, Enter to submit)
- [x] Focus management after navigation
- [x] SEO basics (title tags, meta descriptions per page)
- [x] Performance: code splitting with React.lazy per page

## 12. Testing

- [x] UI component unit tests
  - [x] Button variants and states
  - [x] Input validation display
  - [x] Modal open/close behavior
- [x] Hook tests
  - [x] useAuth behavior (AuthContext)
  - [ ] useRealtime connection states _(pending — tracked in next milestone)_
- [x] Page smoke tests (via `tests/e2e/app.spec.ts`)
- [x] Mock API client for isolated tests
