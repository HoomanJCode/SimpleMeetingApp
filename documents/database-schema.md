# Database Schema (SQLite)

## Overview

SQLite database stored as `data/irmeeting.db`. Uses `better-sqlite3` for synchronous, high-performance queries.

---

## Tables

### `users`

Stores authenticated users (via Google OAuth).

```sql
CREATE TABLE users (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    google_id   TEXT NOT NULL UNIQUE,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL,
    avatar_url  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

| Column      | Type | Constraints     | Description                  |
|-------------|------|-----------------|------------------------------|
| id          | TEXT | PK, UUID        | Internal user ID             |
| google_id   | TEXT | UNIQUE, NOT NULL| Google account identifier    |
| email       | TEXT | NOT NULL        | User's email address         |
| name        | TEXT | NOT NULL        | Display name from Google     |
| avatar_url  | TEXT | NULLABLE        | Google profile picture URL   |
| created_at  | TEXT | NOT NULL        | ISO 8601 timestamp           |
| updated_at  | TEXT | NOT NULL        | ISO 8601 timestamp           |

---

### `meetings`

Stores meeting information.

```sql
CREATE TABLE meetings (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    host_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    date_time   TEXT NOT NULL,
    location    TEXT NOT NULL,
    capacity    INTEGER NOT NULL CHECK(capacity >= 2),
    status      TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'ongoing', 'ended', 'cancelled')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_meetings_host_id ON meetings(host_id);
CREATE INDEX idx_meetings_date_time ON meetings(date_time);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_status_date ON meetings(status, date_time);
```

| Column      | Type    | Constraints              | Description                                |
|-------------|---------|--------------------------|--------------------------------------------|
| id          | TEXT    | PK, UUID                 | Unique meeting ID                          |
| host_id     | TEXT    | FK → users.id, NOT NULL  | Meeting organizer                          |
| title       | TEXT    | NOT NULL, 3-200 chars    | Meeting title                              |
| description | TEXT    | NOT NULL, 10-5000 chars  | Meeting description                        |
| date_time   | TEXT    | NOT NULL, ISO 8601       | Scheduled date/time (must be future on create) |
| location    | TEXT    | NOT NULL, 2-300 chars    | Physical or virtual location               |
| capacity    | INTEGER | NOT NULL, CHECK ≥ 2      | Max number of participants                 |
| status      | TEXT    | NOT NULL, default 'upcoming' | `upcoming`, `ongoing`, `ended`, `cancelled` |
| created_at  | TEXT    | NOT NULL, ISO 8601       | Creation timestamp                         |
| updated_at  | TEXT    | NOT NULL, ISO 8601       | Last update timestamp                      |

---

### `participants`

Junction table for meeting participants (many-to-many).

```sql
CREATE TABLE participants (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    meeting_id  TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(meeting_id, user_id)
);

CREATE UNIQUE INDEX idx_participants_meeting_user ON participants(meeting_id, user_id);
CREATE INDEX idx_participants_meeting_id ON participants(meeting_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
```

| Column      | Type | Constraints                    | Description              |
|-------------|------|--------------------------------|--------------------------|
| id          | TEXT | PK, UUID                       | Unique row ID            |
| meeting_id  | TEXT | FK → meetings.id ON DELETE CASCADE | Reference to meeting |
| user_id     | TEXT | FK → users.id ON DELETE CASCADE    | Reference to user    |
| created_at  | TEXT | NOT NULL, ISO 8601             | When user joined          |

**Constraint:** `UNIQUE(meeting_id, user_id)` — prevents duplicate joins.

---

### `refresh_tokens`

Stores refresh tokens for JWT renewal.

```sql
CREATE TABLE refresh_tokens (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

| Column      | Type | Constraints                 | Description                |
|-------------|------|------------------------------|----------------------------|
| id          | TEXT | PK, UUID                     | Unique row ID              |
| user_id     | TEXT | FK → users.id ON DELETE CASCADE | Owning user           |
| token       | TEXT | UNIQUE, NOT NULL             | Refresh token value        |
| expires_at  | TEXT | NOT NULL, ISO 8601           | Expiration timestamp (30d) |
| created_at  | TEXT | NOT NULL, ISO 8601           | Creation timestamp         |

---

## Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  users   │       │  meetings    │       │ refr_tkns │
├──────────┤       ├──────────────┤       ├──────────┤
│ id       │──┐    │ id           │──┐    │ id       │
│ google_id│  │    │ host_id      │──┼┐   │ user_id  │──┐
│ email    │  │    │ title        │  ││   │ token    │  │
│ name     │  │    │ description  │  ││   │ expires  │  │
│ avatar   │  │    │ date_time    │  ││   │ created  │  │
│ created  │  ├───→│ location     │  ││   └──────────┘  │
│ updated  │  │    │ capacity     │  ││                 │
└──────────┘  │    │ status       │  ││    ┌──────────────┐
              │    │ created_at   │  ││    │ participants │
              │    │ updated_at   │  ││    ├──────────────┤
              │    └──────────────┘  ││    │ id           │
              │                       ││    │ meeting_id   │──┘
              │                       ││    │ user_id      │──┘
              │                       ││    │ created_at   │
              │                       ││    └──────────────┘
              └───────────────────────┘│
                (FK: host_id)          │
                                       │
                (FK: meeting_id)───────┘
                (FK: user_id)
```

---

## Seed Data

For development, seed the database with:

```sql
-- Sample users
INSERT INTO users (id, google_id, email, name, avatar_url) VALUES
('u1', 'g-111', 'alice@gmail.com', 'Alice Johnson', NULL),
('u2', 'g-222', 'bob@gmail.com', 'Bob Smith', NULL),
('u3', 'g-333', 'charlie@gmail.com', 'Charlie Brown', NULL);

-- Sample meetings
INSERT INTO meetings (id, host_id, title, description, date_time, location, capacity) VALUES
('m1', 'u1', 'React Nerds Meetup', 'Monthly discussion for React enthusiasts.', '2026-08-01T18:00:00Z', 'Tehran Coworking Hub', 30),
('m2', 'u2', 'TypeScript Workshop', 'Hands-on TS workshop for beginners.', '2026-08-05T14:00:00Z', 'Online (Zoom)', 20),
('m3', 'u3', 'Node.js Performance', 'Deep dive into Node.js perf optimization.', '2026-08-10T19:00:00Z', 'Startup Cafe', 15);

-- Sample participants
INSERT INTO participants (meeting_id, user_id) VALUES
('m1', 'u2'),
('m1', 'u3'),
('m2', 'u1'),
('m2', 'u3');
```

---

## Migration Strategy

Since we use SQLite, migrations are handled by a simple migration runner:

1. Create numbered migration files in `backend/src/db/migrations/`
2. Each file exports an `up` function
3. The `MigrationRunner` checks a `migrations` table and runs pending migrations
4. Migrations run on server startup

```sql
-- Internal migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

```
backend/src/db/migrations/
├── 001_create_users.sql
├── 002_create_meetings.sql
├── 003_create_participants.sql
├── 004_create_refresh_tokens.sql
└── 005_create_indexes.sql
```
