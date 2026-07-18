# Project Structure

## Top-Level Layout

```
IrMeetingApp/
├── backend/                  # Express REST API + WebSocket server
│   ├── src/
│   │   ├── index.ts          # Entry point, server startup
│   │   ├── app.ts            # Express app configuration
│   │   ├── config/
│   │   │   └── env.ts        # Environment variable validation (Zod)
│   │   ├── db/
│   │   │   ├── connection.ts  # better-sqlite3 connection singleton
│   │   │   ├── migrations/   # SQL migration files
│   │   │   │   ├── 001_create_users.sql
│   │   │   │   ├── 002_create_meetings.sql
│   │   │   │   ├── 003_create_participants.sql
│   │   │   │   └── 004_create_refresh_tokens.sql
│   │   │   └── seed.ts       # Development seed data
│   │   ├── middleware/
│   │   │   ├── authenticate.ts    # JWT verification
│   │   │   ├── optionalAuth.ts    # Soft auth (doesn't fail)
│   │   │   ├── errorHandler.ts    # Global error handler
│   │   │   ├── validate.ts        # Zod request validation
│   │   │   └── rateLimiter.ts     # Rate limiting
│   │   ├── routes/
│   │   │   ├── index.ts           # Route aggregator
│   │   │   ├── auth.routes.ts     # /api/auth/*
│   │   │   ├── meeting.routes.ts  # /api/meetings/*
│   │   │   └── health.routes.ts   # /api/health
│   │   ├── services/
│   │   │   ├── authService.ts     # OAuth + JWT logic
│   │   │   ├── meetingService.ts  # Meeting CRUD + business logic
│   │   │   └── userService.ts     # User-related operations
│   │   ├── websocket/
│   │   │   ├── index.ts           # Socket.IO server setup
│   │   │   └── events.ts          # Event handlers
│   │   ├── types/
│   │   │   ├── express.d.ts       # Express augmentation
│   │   │   └── models.ts          # Shared type definitions
│   │   └── utils/
│   │       ├── jwt.ts             # JWT sign/verify helpers
│   │       ├── errors.ts          # Custom error classes
│   │       └── logger.ts          # Pino logger setup
│   ├── data/                      # SQLite DB file (gitignored)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── .env.example
│
├── frontend/                 # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Root component with router
│   │   ├── index.css          # Tailwind imports
│   │   ├── api/
│   │   │   ├── client.ts      # Axios/fetch wrapper with auth interceptor
│   │   │   ├── auth.ts        # Auth API calls
│   │   │   └── meetings.ts    # Meeting API calls
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx # Auth state provider
│   │   │   ├── useAuth.ts     # Auth hook
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/
│   │   │   ├── useRealtime.ts # WebSocket + polling
│   │   │   └── useMeetings.ts # Meeting data hook
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── meeting/
│   │   │   │   ├── MeetingCard.tsx
│   │   │   │   ├── MeetingList.tsx
│   │   │   │   ├── MeetingForm.tsx
│   │   │   │   ├── MeetingDetail.tsx
│   │   │   │   ├── ParticipantList.tsx
│   │   │   │   └── ConnectionStatus.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Spinner.tsx
│   │   │       ├── Avatar.tsx
│   │   │       └── Badge.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── MeetingDetailPage.tsx
│   │   │   ├── CreateMeetingPage.tsx
│   │   │   ├── EditMeetingPage.tsx
│   │   │   ├── MyMeetingsPage.tsx
│   │   │   └── AuthCallbackPage.tsx
│   │   ├── lib/
│   │   │   └── utils.ts      # Date formatting, etc.
│   │   └── types/
│   │       └── index.ts       # Shared TypeScript types
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── tests/                    # E2E & integration tests
│   ├── e2e/
│   │   ├── auth.spec.ts      # Login/logout flows
│   │   ├── meetings.spec.ts  # Create/join/leave flows
│   │   └── realtime.spec.ts  # Real-time update tests
│   ├── fixtures/
│   │   ├── users.ts          # Test user data
│   │   └── meetings.ts       # Test meeting data
│   ├── helpers/
│   │   ├── api.ts            # API helper for test setup
│   │   └── auth.ts           # Auth token helper
│   ├── playwright.config.ts
│   └── package.json
│
├── documents/                # Planning & architecture docs
│   ├── architecture.md
│   ├── api-design.md
│   ├── database-schema.md
│   ├── authentication.md
│   ├── real-time-communication.md
│   └── project-structure.md
│
├── todos/                    # Implementation task lists
│   ├── master-todo.md
│   ├── backend-todo.md
│   ├── frontend-todo.md
│   └── testing-todo.md
│
├── .gitignore
└── README.md
```

## Key Configuration Files

### Root `.gitignore`
```
node_modules/
dist/
.env
*.db
data/
.DS_Store
```

### Backend `package.json` (key dependencies)
```json
{
  "dependencies": {
    "express": "^4.21.0",
    "better-sqlite3": "^11.0.0",
    "socket.io": "^4.7.0",
    "jsonwebtoken": "^9.0.0",
    "zod": "^3.23.0",
    "cors": "^2.8.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^7.0.0",
    "pino": "^9.0.0",
    "google-auth-library": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/express": "^4.17.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/cors": "^2.8.0",
    "vitest": "^2.0.0",
    "supertest": "^7.0.0",
    "tsx": "^4.0.0",
    "nodemon": "^3.0.0"
  }
}
```

### Frontend `package.json` (key dependencies)
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^24.0.0"
  }
}
```

### Tests `package.json` (key dependencies)
```json
{
  "devDependencies": {
    "@playwright/test": "^1.46.0",
    "typescript": "^5.5.0"
  }
}
```
