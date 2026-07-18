# System Architecture

## Overview

IrMeetingApp is a web application for creating and joining meetings, similar to Meetup. The system consists of three main parts:

- **Backend**: REST API + WebSocket server (Node.js + Express + TypeScript)
- **Frontend**: Single-page application (React + TypeScript)
- **Tests**: End-to-end and integration tests (separate project)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                │
│  ┌──────────────────────┐  ┌─────────────────────┐ │
│  │   React SPA (Vite)   │  │  WebSocket Client   │ │
│  │   - Meeting CRUD     │  │  - Real-time updates │ │
│  │   - Google OAuth UI  │  │  - Polling fallback  │ │
│  └──────────┬───────────┘  └──────────┬──────────┘ │
└─────────────┼─────────────────────────┼────────────┘
              │ HTTPS (REST + JWT)      │ WSS / HTTPS
              ▼                         ▼
┌─────────────────────────────────────────────────────┐
│                  BACKEND (Express)                  │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │ REST API │ │  Auth    │ │ WebSocket Manager  │  │
│  │ Routes   │ │ Middleware│ │ (Socket.IO)        │  │
│  └────┬─────┘ └────┬─────┘ └────────┬───────────┘  │
│       │            │               │               │
│       ▼            ▼               ▼               │
│  ┌─────────────────────────────────────────────┐   │
│  │              Service Layer                   │   │
│  │  - MeetingService  - UserService            │   │
│  │  - AuthService     - ParticipantService     │   │
│  └────────────────────┬────────────────────────┘   │
│                       │                            │
│                       ▼                            │
│  ┌─────────────────────────────────────────────┐   │
│  │         Data Access Layer (better-sqlite3)   │   │
│  └────────────────────┬────────────────────────┘   │
└───────────────────────┼────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │     SQLite      │
              │  irmeeting.db   │
              └─────────────────┘
```

## Data Flow

### Create Meeting
1. User authenticates via Google OAuth → receives JWT
2. User fills meeting form (title, description, datetime, location, capacity)
3. Frontend sends `POST /api/meetings` with JWT in `Authorization` header
4. Backend validates JWT, creates meeting record in SQLite
5. Backend broadcasts "new meeting" event via WebSocket
6. Frontend redirects to meeting detail page

### Join Meeting
1. User browses meeting list (`GET /api/meetings`)
2. User clicks "Join" on a meeting
3. Frontend sends `POST /api/meetings/:id/join` with JWT
4. Backend validates, adds participant, returns updated participant list
5. Backend broadcasts "participant joined" event via WebSocket
6. All viewers of that meeting see the updated participant count in real time

### Polling Fallback
When WebSocket connection fails:
1. Frontend detects WebSocket disconnect
2. Falls back to polling `GET /api/meetings/:id` every 5 seconds
3. Updates UI with fresh data from poll responses
4. Attempts WebSocket reconnection in background

## Technology Stack

| Component        | Technology              | Rationale                                      |
|------------------|-------------------------|-------------------------------------------------|
| Runtime          | Node.js 20+             | Mature, fast, great ecosystem                   |
| Framework        | Express 4               | Most popular, simple, flexible                  |
| Language         | TypeScript 5            | Type safety, better DX                          |
| Database         | SQLite (better-sqlite3) | Zero-config, fast, perfect for single-server    |
| Realtime         | Socket.IO               | WebSocket with auto fallback, rooms support     |
| Auth             | Google OAuth 2.0 + JWT  | No password management, industry standard       |
| Frontend         | React 18 + Vite         | Fast builds, great DX, component model          |
| Styling          | Tailwind CSS            | Rapid UI development, production-ready          |
| Testing (API)    | Vitest + Supertest      | Fast, modern, compatible with TS                |
| Testing (E2E)    | Playwright              | Cross-browser, reliable, great DX               |

## Security Considerations

- **JWT tokens**: Short-lived access tokens (15 min), stored in memory/httpOnly cookie
- **CORS**: Strict origin whitelist for production
- **Input validation**: Zod schemas on all endpoints
- **Rate limiting**: Express-rate-limit on auth and mutation endpoints
- **Helmet**: HTTP security headers
- **SQL injection**: Parameterized queries with better-sqlite3

## Production Readiness Checklist

- [ ] HTTPS enforced (via reverse proxy like Nginx/Caddy)
- [ ] Environment variables for all secrets (never committed)
- [ ] Proper error handling with structured error responses
- [ ] Logging with structured format (pino/winston)
- [ ] Health check endpoint (`GET /api/health`)
- [ ] Graceful shutdown handling
- [ ] CORS configured for production domains
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] Static file serving with cache headers for frontend build
