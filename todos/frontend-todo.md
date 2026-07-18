# Frontend Implementation Todo

## 1. Project Setup

- [ ] Create Vite + React + TypeScript project
- [ ] Install dependencies:
  - `react`, `react-dom`, `react-router-dom`, `socket.io-client`
- [ ] Install dev dependencies:
  - `typescript`, `@types/react`, `@types/react-dom`
  - `vite`, `@vitejs/plugin-react`
  - `tailwindcss`, `postcss`, `autoprefixer`
  - `vitest`, `@testing-library/react`, `jsdom`
- [ ] Configure `tailwind.config.js`
- [ ] Configure `postcss.config.js`
- [ ] Configure `vite.config.ts` (proxy API requests to backend)
- [ ] Configure `tsconfig.json`
- [ ] Add scripts: `dev`, `build`, `preview`, `test`, `lint`

## 2. Core App Structure

- [ ] Create `src/main.tsx` — React DOM render with providers
- [ ] Create `src/index.css` — Tailwind directives + global styles
- [ ] Create `src/App.tsx` — Router setup
  - [ ] `/` → HomePage
  - [ ] `/meetings/new` → CreateMeetingPage (protected)
  - [ ] `/meetings/:id` → MeetingDetailPage
  - [ ] `/meetings/:id/edit` → EditMeetingPage (protected)
  - [ ] `/my-meetings` → MyMeetingsPage (protected)
  - [ ] `/auth/callback` → AuthCallbackPage
  - [ ] `*` → NotFoundPage
- [ ] Create `src/types/index.ts` — shared TypeScript types

## 3. API Client

- [ ] Create `src/api/client.ts`
  - [ ] Axios or fetch wrapper with base URL
  - [ ] Request interceptor: adds JWT to Authorization header
  - [ ] Response interceptor: handles 401 → refresh token → retry
  - [ ] Error normalization
- [ ] Create `src/api/auth.ts`
  - [ ] `getCurrentUser()` → GET /api/auth/me
  - [ ] `refreshToken(refreshToken)` → POST /api/auth/refresh
- [ ] Create `src/api/meetings.ts`
  - [ ] `getMeetings(params)` → GET /api/meetings
  - [ ] `getMeeting(id)` → GET /api/meetings/:id
  - [ ] `createMeeting(data)` → POST /api/meetings
  - [ ] `updateMeeting(id, data)` → PUT /api/meetings/:id
  - [ ] `deleteMeeting(id)` → DELETE /api/meetings/:id
  - [ ] `joinMeeting(id)` → POST /api/meetings/:id/join
  - [ ] `leaveMeeting(id)` → POST /api/meetings/:id/leave
  - [ ] `getMyMeetings()` → GET /api/users/me/meetings

## 4. Authentication (Frontend)

- [ ] Create `src/auth/AuthContext.tsx`
  - [ ] `user: User | null`
  - [ ] `isLoading: boolean`
  - [ ] `login()` — redirect to `/api/auth/google`
  - [ ] `logout()` — clear tokens, redirect home
  - [ ] `getToken()` — return current access token
  - [ ] On mount: check if returning from OAuth callback
- [ ] Create `src/auth/useAuth.ts` — convenience hook
- [ ] Create `src/auth/ProtectedRoute.tsx`
  - [ ] Redirects to home with message if not authenticated
  - [ ] Shows spinner while auth state is loading
- [ ] Create `src/pages/AuthCallbackPage.tsx`
  - [ ] Extracts `token` and `refreshToken` from URL query
  - [ ] Stores tokens in memory via AuthContext
  - [ ] Redirects to home

## 5. UI Components

- [ ] Create `src/components/ui/Button.tsx`
  - [ ] Variants: `primary`, `secondary`, `danger`, `ghost`
  - [ ] Sizes: `sm`, `md`, `lg`
  - [ ] Loading state with spinner
  - [ ] Disabled state
- [ ] Create `src/components/ui/Input.tsx`
  - [ ] Text, textarea, number variants
  - [ ] Label, error message, helper text
  - [ ] Focus and error styles
- [ ] Create `src/components/ui/Modal.tsx`
  - [ ] Overlay with backdrop
  - [ ] Title, body, footer slots
  - [ ] Close on Escape and backdrop click
  - [ ] Animated enter/exit
- [ ] Create `src/components/ui/Spinner.tsx`
  - [ ] Sizes: `sm`, `md`, `lg`
- [ ] Create `src/components/ui/Avatar.tsx`
  - [ ] Image (with fallback initials)
  - [ ] Sizes: `sm`, `md`, `lg`
- [ ] Create `src/components/ui/Badge.tsx`
  - [ ] Variants: `success`, `warning`, `error`, `info`
- [ ] Create `src/components/ui/Toast.tsx`
  - [ ] Success, error, warning, info variants
  - [ ] Auto-dismiss with configurable duration
  - [ ] Toast container with stacking

## 6. Layout Components

- [ ] Create `src/components/layout/Header.tsx`
  - [ ] App logo/name (links to home)
  - [ ] Navigation: "My Meetings" (if authenticated)
  - [ ] "Create Meeting" button (if authenticated)
  - [ ] User avatar + dropdown menu (if authenticated)
    - [ ] "My Meetings" link
    - [ ] "Sign Out" button
  - [ ] "Sign In with Google" button (if not authenticated)
  - [ ] Mobile hamburger menu
- [ ] Create `src/components/layout/Footer.tsx`
  - [ ] Copyright
  - [ ] GitHub link
- [ ] Create `src/components/layout/Layout.tsx`
  - [ ] Header + main content + Footer
  - [ ] Toast container
  - [ ] Scroll to top on route change

## 7. Meeting Components

- [ ] Create `src/components/meeting/MeetingCard.tsx`
  - [ ] Title, date/time, location
  - [ ] Participant count (e.g., "12/30 spots")
  - [ ] Host avatar + name
  - [ ] Status badge (upcoming, ongoing, ended, cancelled)
  - [ ] Hover effect with shadow
  - [ ] Click navigates to meeting detail
- [ ] Create `src/components/meeting/MeetingList.tsx`
  - [ ] Grid layout (responsive: 1 col mobile, 2 tablet, 3 desktop)
  - [ ] Search input (debounced)
  - [ ] Empty state illustration
  - [ ] Loading skeleton grid
  - [ ] Pagination or infinite scroll
- [ ] Create `src/components/meeting/MeetingForm.tsx`
  - [ ] Title input (text)
  - [ ] Description input (textarea)
  - [ ] Date/Time picker
  - [ ] Location input (text)
  - [ ] Capacity input (number, min=2)
  - [ ] Validation: inline errors, disabled submit until valid
  - [ ] Submit button with loading state
  - [ ] Cancel button
- [ ] Create `src/components/meeting/MeetingDetail.tsx`
  - [ ] Meeting title, description, date/time, location
  - [ ] Host info (avatar, name)
  - [ ] Capacity indicator (progress bar)
  - [ ] "Join" / "Leave" / "Edit" / "Delete" buttons (context-dependent)
  - [ ] Join button disabled when full
  - [ ] Status badge
  - [ ] Connection status indicator (live vs polling)
- [ ] Create `src/components/meeting/ParticipantList.tsx`
  - [ ] Grid of avatars with names
  - [ ] "X more" overflow for large lists
  - [ ] Host badge on host
  - [ ] Join date tooltip
- [ ] Create `src/components/meeting/ConnectionStatus.tsx`
  - [ ] Green dot + "Live" when WebSocket connected
  - [ ] Yellow dot + "Syncing" when polling
  - [ ] Red dot + "Offline" when disconnected
  - [ ] Subtle placement (bottom corner of meeting detail)

## 8. Pages

- [ ] Create `src/pages/HomePage.tsx`
  - [ ] Hero section (or simple title + subtitle)
  - [ ] Search bar
  - [ ] MeetingList
  - [ ] "Create Meeting" CTA for authenticated users
- [ ] Create `src/pages/CreateMeetingPage.tsx`
  - [ ] Page title: "Create a New Meeting"
  - [ ] MeetingForm component
  - [ ] Redirect to meeting detail on success
  - [ ] Toast notification on success/error
- [ ] Create `src/pages/EditMeetingPage.tsx`
  - [ ] Page title: "Edit Meeting"
  - [ ] MeetingForm pre-filled with existing data
  - [ ] "Delete Meeting" button with confirmation modal
  - [ ] Redirect to meeting detail on success
- [ ] Create `src/pages/MeetingDetailPage.tsx`
  - [ ] MeetingDetail with real-time updates
  - [ ] ParticipantList
  - [ ] useRealtime hook for live updates
  - [ ] 404 state if meeting not found
  - [ ] Back button
- [ ] Create `src/pages/MyMeetingsPage.tsx`
  - [ ] Tabs: "Hosting" | "Attending"
  - [ ] MeetingList for each tab
  - [ ] Empty state when no meetings

## 9. Real-Time Integration

- [ ] Create `src/hooks/useRealtime.ts`
  - [ ] Connect Socket.IO with JWT auth
  - [ ] Subscribe/unsubscribe to meeting rooms
  - [ ] Handle meeting:updated event
  - [ ] Handle participant:joined event
  - [ ] Handle participant:left event
  - [ ] Fall back to polling on disconnect
  - [ ] Attempt reconnection with backoff
  - [ ] Return connection state (connected/polling/disconnected)
  - [ ] Return latest meeting data

## 10. Data Hooks

- [ ] Create `src/hooks/useMeetings.ts`
  - [ ] `useMeetingList(params)` — paginated meeting list
  - [ ] `useMeeting(id)` — single meeting
  - [ ] `useCreateMeeting()` — mutation
  - [ ] `useUpdateMeeting()` — mutation
  - [ ] `useDeleteMeeting()` — mutation
  - [ ] `useJoinMeeting()` — mutation
  - [ ] `useLeaveMeeting()` — mutation
  - [ ] `useMyMeetings()` — user's meetings
  - [ ] Loading/error states for all

## 11. Polish & Edge Cases

- [ ] Responsive design for all pages (mobile-first)
- [ ] Dark mode (using Tailwind dark: classes + system preference)
- [ ] Skeleton loading states
- [ ] Empty states with illustrations and CTAs
- [ ] Error boundaries for critical sections
- [ ] 404 page with "Back to Home" link
- [ ] Form dirty state warnings (prevent accidental navigation)
- [ ] Toast notifications for all mutations
- [ ] Confirmation modals for delete, leave
- [ ] Keyboard accessibility (tab navigation, Enter to submit)
- [ ] Focus management after navigation
- [ ] SEO basics (title tags, meta descriptions per page)
- [ ] Performance: code splitting with React.lazy per page

## 12. Testing

- [ ] UI component unit tests
  - [ ] Button variants and states
  - [ ] Input validation display
  - [ ] Modal open/close behavior
- [ ] Hook tests
  - [ ] useAuth behavior
  - [ ] useRealtime connection states
- [ ] Page smoke tests
- [ ] Mock API client for isolated tests
