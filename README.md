# IrMeetingApp

A Meetup-like web application for creating and joining meetings. Built with Node.js + Express (backend), React + TypeScript (frontend), SQLite (database), and Socket.IO for real-time updates.

## Architecture

```
IrMeetingApp/
├── backend/       # Express REST API + WebSocket server
├── frontend/      # React SPA (Vite + TypeScript + Tailwind)
├── tests/         # E2E tests (Playwright)
├── documents/     # Architecture & planning docs
└── todos/         # Implementation task lists
```

## Tech Stack

| Layer          | Technology                     |
|----------------|--------------------------------|
| Backend        | Node.js, Express, TypeScript   |
| Database       | SQLite (better-sqlite3)        |
| Realtime       | Socket.IO (WebSocket + polling)|
| Auth           | Google OAuth 2.0 + JWT         |
| Frontend       | React 18, Vite, TypeScript     |
| Styling        | Tailwind CSS                   |
| Backend Tests  | Vitest + Supertest             |
| E2E Tests      | Playwright                     |

## Quick Start

### Prerequisites

- Node.js 20+
- Google Cloud Console project (for OAuth)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Google OAuth credentials and JWT secret
npm install
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Tests

```bash
cd tests
npm install
npx playwright install
npx playwright test
```

## Documentation

- [System Architecture](documents/architecture.md)
- [API Design](documents/api-design.md)
- [Database Schema](documents/database-schema.md)
- [Authentication](documents/authentication.md)
- [Real-Time Communication](documents/real-time-communication.md)
- [Project Structure](documents/project-structure.md)

## Implementation Plan

- [Master Todo](todos/master-todo.md)
- [Backend Todo](todos/backend-todo.md)
- [Frontend Todo](todos/frontend-todo.md)
- [Testing Todo](todos/testing-todo.md)

## License

MIT
