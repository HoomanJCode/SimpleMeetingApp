# API Design

## Base URL

```
Development: http://localhost:3001/api
Production:  https://<domain>/api
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

Public endpoints are marked as `[Public]`.

---

## Endpoints

### Health

#### `GET /health` [Public]
Server health check.

**Response** `200`
```json
{
  "status": "ok",
  "timestamp": "2026-07-19T12:00:00Z",
  "uptime": 3600
}
```

---

### Authentication

#### `GET /auth/google` [Public]
Redirects to Google OAuth consent screen.

**Query Parameters:**
| Param  | Type   | Description                  |
|--------|--------|------------------------------|
| redirect | string | Post-auth redirect URL (optional) |

**Response** `302` → Google OAuth URL

---

#### `GET /auth/google/callback` [Public]
Google OAuth callback. Exchanges code for tokens.

**Query Parameters:**
| Param | Type   | Description         |
|-------|--------|---------------------|
| code  | string | OAuth code from Google |

**Response** `302` → Frontend URL with token

Redirects to: `http://localhost:5173/auth/callback?token=<jwt>`

---

#### `POST /auth/refresh`
Refresh an expired JWT.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response** `200`
```json
{
  "token": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:**
| Status | Message             |
|--------|---------------------|
| 401    | Invalid refresh token |

---

#### `GET /auth/me`
Get current authenticated user profile.

**Response** `200`
```json
{
  "id": "uuid",
  "email": "user@gmail.com",
  "name": "John Doe",
  "avatarUrl": "https://lh3.googleusercontent.com/...",
  "createdAt": "2026-07-19T12:00:00Z"
}
```

**Errors:**
| Status | Message       |
|--------|---------------|
| 401    | Unauthorized  |

---

### Meetings

#### `GET /meetings` [Public]
List upcoming meetings (paginated).

**Query Parameters:**
| Param  | Type    | Default | Description         |
|--------|---------|---------|---------------------|
| page   | number  | 1       | Page number         |
| limit  | number  | 20      | Items per page (max 50) |
| search | string  | -       | Search by title     |
| status | string  | upcoming| Filter by status    |

**Response** `200`
```json
{
  "meetings": [
    {
      "id": "uuid",
      "title": "React Meetup July",
      "description": "Monthly React discussion",
      "dateTime": "2026-07-25T18:00:00Z",
      "location": "Tehran Innovation Center",
      "capacity": 50,
      "participantCount": 23,
      "host": {
        "id": "uuid",
        "name": "John Doe",
        "avatarUrl": "https://..."
      },
      "status": "upcoming",
      "createdAt": "2026-07-19T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

#### `POST /meetings`
Create a new meeting. User becomes the host.

**Request Body:**
```json
{
  "title": "React Meetup July",
  "description": "Monthly React discussion and networking",
  "dateTime": "2026-07-25T18:00:00Z",
  "location": "Tehran Innovation Center",
  "capacity": 50
}
```

**Validation:**
| Field       | Type   | Required | Constraints              |
|-------------|--------|----------|--------------------------|
| title       | string | Yes      | 3-200 characters         |
| description | string | Yes      | 10-5000 characters       |
| dateTime    | string | Yes      | ISO 8601, must be future |
| location    | string | Yes      | 2-300 characters         |
| capacity    | number | Yes      | 2-10000, integer         |

**Response** `201`
```json
{
  "id": "uuid",
  "title": "React Meetup July",
  "description": "Monthly React discussion",
  "dateTime": "2026-07-25T18:00:00Z",
  "location": "Tehran Innovation Center",
  "capacity": 50,
  "participantCount": 1,
  "host": {
    "id": "uuid",
    "name": "John Doe",
    "avatarUrl": "https://..."
  },
  "status": "upcoming",
  "createdAt": "2026-07-19T12:00:00Z"
}
```

---

#### `GET /meetings/:id` [Public]
Get meeting details.

**Response** `200`
```json
{
  "id": "uuid",
  "title": "React Meetup July",
  "description": "Monthly React discussion and networking",
  "dateTime": "2026-07-25T18:00:00Z",
  "location": "Tehran Innovation Center",
  "capacity": 50,
  "participantCount": 23,
  "host": {
    "id": "uuid",
    "name": "John Doe",
    "avatarUrl": "https://..."
  },
  "participants": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "avatarUrl": "https://...",
      "joinedAt": "2026-07-19T14:00:00Z"
    }
  ],
  "isJoined": false,
  "status": "upcoming",
  "createdAt": "2026-07-19T12:00:00Z"
}
```

**Note:** `isJoined` is `true` only if the request includes a valid JWT and the user is a participant.

---

#### `PUT /meetings/:id`
Update meeting (host only).

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "dateTime": "2026-08-01T18:00:00Z",
  "location": "New Location",
  "capacity": 60
}
```

**Response** `200` → Updated meeting object

**Errors:**
| Status | Message             |
|--------|---------------------|
| 401    | Unauthorized        |
| 403    | Not the host        |
| 404    | Meeting not found   |

---

#### `DELETE /meetings/:id`
Delete meeting (host only).

**Response** `204` (No Content)

**Errors:**
| Status | Message             |
|--------|---------------------|
| 401    | Unauthorized        |
| 403    | Not the host        |
| 404    | Meeting not found   |

---

#### `POST /meetings/:id/join`
Join a meeting as a participant.

**Response** `200`
```json
{
  "message": "Successfully joined",
  "participantCount": 24
}
```

**Errors:**
| Status | Message                  |
|--------|--------------------------|
| 401    | Unauthorized             |
| 404    | Meeting not found        |
| 409    | Meeting is full          |
| 409    | Already joined           |
| 400    | Meeting already started  |

---

#### `POST /meetings/:id/leave`
Leave a meeting.

**Response** `200`
```json
{
  "message": "Successfully left",
  "participantCount": 22
}
```

**Errors:**
| Status | Message                |
|--------|------------------------|
| 401    | Unauthorized           |
| 404    | Meeting not found      |
| 409    | Not a participant      |
| 409    | Cannot leave own meeting as host |

---

### Users (Optional, nice-to-have)

#### `GET /users/me/meetings`
Get meetings created/joined by current user.

**Response** `200`
```json
{
  "hosting": [ /* meeting objects */ ],
  "attending": [ /* meeting objects */ ]
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "MEETING_NOT_FOUND",
    "message": "Meeting with the given ID does not exist",
    "details": {}
  }
}
```

**Error codes:**

| HTTP Status | Code                  | Description                |
|-------------|-----------------------|----------------------------|
| 400         | VALIDATION_ERROR      | Input validation failed    |
| 401         | UNAUTHORIZED          | Missing/invalid token      |
| 403         | FORBIDDEN             | Not allowed                |
| 404         | NOT_FOUND             | Resource not found         |
| 409         | CONFLICT              | Resource state conflict    |
| 429         | RATE_LIMITED          | Too many requests          |
| 500         | INTERNAL_ERROR        | Unexpected server error    |

## WebSocket Events

### Server → Client

| Event                  | Payload                         | Description                     |
|------------------------|---------------------------------|---------------------------------|
| `meeting:created`      | Meeting object                  | New meeting was created         |
| `meeting:updated`      | Meeting object                  | Meeting details changed         |
| `meeting:deleted`      | `{ meetingId: string }`         | Meeting was removed             |
| `participant:joined`   | `{ meetingId, participant }`    | Someone joined a meeting        |
| `participant:left`     | `{ meetingId, userId }`         | Someone left a meeting          |
| `meeting:cancelled`    | `{ meetingId }`                 | Meeting was cancelled           |

### Client → Server

| Event              | Payload                    | Description              |
|--------------------|----------------------------|--------------------------|
| `meeting:subscribe`| `{ meetingId: string }`    | Join meeting room        |
| `meeting:unsubscribe`| `{ meetingId: string }`  | Leave meeting room       |

### Rooms

- **Global room** (`global`): All connected clients. Receives `meeting:created`, `meeting:deleted`.
- **Meeting room** (`meeting:<id>`): Clients viewing a specific meeting. Receives `participant:*`, `meeting:updated`, `meeting:cancelled`.
