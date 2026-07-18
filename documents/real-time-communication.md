# Real-Time Communication

## Strategy: WebSocket Primary, Polling Fallback

The system uses **Socket.IO** (WebSocket) as the primary real-time channel with automatic fallback to HTTP long-polling when WebSocket connections fail. Additionally, a client-side polling mechanism acts as a last-resort fallback.

## Architecture

```
┌──────────────────────────────────────┐
│            FRONTEND                   │
│  ┌────────────────────────────────┐  │
│  │  useRealtime(meetingId)        │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │ SocketIO │ │ Polling    │  │  │
│  │  │ Client   │ │ Fallback   │  │  │
│  │  └────┬─────┘ └─────┬──────┘  │  │
│  │       │             │          │  │
│  │       └──────┬──────┘          │  │
│  │              ▼                 │  │
│  │     ConnectionManager          │  │
│  └────────────────────────────────┘  │
└────────────────┬─────────────────────┘
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
┌──────────────┐    ┌──────────────────┐
│ Socket.IO    │    │ REST API         │
│ Server       │    │ GET /meetings/:id│
└──────┬───────┘    └──────────────────┘
       │
       ▼
┌──────────────────┐
│  Event Emitter   │
│  (Node EventEmitter)│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Meeting Service │
│  broadcasts via  │
│  Socket.IO       │
└──────────────────┘
```

## WebSocket Details (Socket.IO)

### Server Setup

```typescript
// backend/src/websocket/index.ts
import { Server } from 'socket.io';
import http from 'http';

export function createWebSocketServer(httpServer: http.Server) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
    // Socket.IO automatically falls back to HTTP long-polling
    // when WebSocket upgrade fails
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const user = verifyJwt(token);
        socket.data.user = user;
      } catch {
        // Allow unauthenticated connections (read-only)
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join meeting room
    socket.on('meeting:subscribe', ({ meetingId }) => {
      socket.join(`meeting:${meetingId}`);
    });

    // Leave meeting room
    socket.on('meeting:unsubscribe', ({ meetingId }) => {
      socket.leave(`meeting:${meetingId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
```

### Events Summary

| Direction | Event | Payload | Room |
|-----------|-------|---------|------|
| Server → Client | `meeting:created` | Meeting object | `global` |
| Server → Client | `meeting:updated` | Meeting object | `meeting:<id>` |
| Server → Client | `meeting:deleted` | `{ meetingId }` | `global` + `meeting:<id>` |
| Server → Client | `meeting:cancelled` | `{ meetingId }` | `meeting:<id>` |
| Server → Client | `participant:joined` | `{ meetingId, participant }` | `meeting:<id>` |
| Server → Client | `participant:left` | `{ meetingId, userId }` | `meeting:<id>` |
| Client → Server | `meeting:subscribe` | `{ meetingId }` | — |
| Client → Server | `meeting:unsubscribe` | `{ meetingId }` | — |

### Broadcasting from Services

```typescript
// After creating a meeting
io.to('global').emit('meeting:created', meeting);

// After someone joins
io.to(`meeting:${meetingId}`).emit('participant:joined', {
  meetingId,
  participant: user,
});

// After meeting update
io.to(`meeting:${meetingId}`).emit('meeting:updated', updatedMeeting);
```

## Polling Fallback

### Client-Side Implementation

```typescript
// frontend/src/hooks/useRealtime.ts
export function useRealtime(meetingId: string | undefined) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!meetingId) return;

    // Try WebSocket
    const socket = io(API_URL, {
      auth: { token: getAccessToken() },
    });

    socket.on('connect', () => {
      setIsLive(true);
      clearPolling();
      socket.emit('meeting:subscribe', { meetingId });
    });

    socket.on('connect_error', () => {
      setIsLive(false);
      startPolling(meetingId, setMeeting);
    });

    socket.on('disconnect', () => {
      setIsLive(false);
      startPolling(meetingId, setMeeting);
    });

    socket.on('meeting:updated', setMeeting);
    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      clearPolling();
    };
  }, [meetingId]);

  return { meeting, isLive };
}

function startPolling(meetingId: string, setter: Dispatch<Meeting>) {
  if (window.__pollInterval) return;
  window.__pollInterval = window.setInterval(async () => {
    const res = await fetch(`${API_URL}/api/meetings/${meetingId}`);
    if (res.ok) {
      setter(await res.json());
    }
  }, 5000); // Poll every 5 seconds
}

function clearPolling() {
  if (window.__pollInterval) {
    clearInterval(window.__pollInterval);
    window.__pollInterval = null;
  }
}
```

### Polling Strategy

- **Interval**: 5 seconds
- **Scope**: Only active on meeting detail pages
- **Auto-start**: When WebSocket disconnects or fails to connect
- **Auto-stop**: When WebSocket reconnects
- **Indicator**: Show a subtle "Live updates paused" indicator when in polling mode

## Connection State UI

The frontend should display a small connection status indicator:

| State | Indicator |
|-------|-----------|
| Connected (WebSocket) | 🟢 Live (green dot) |
| Polling | 🟡 Syncing (yellow dot) |
| Disconnected | 🔴 Offline (red dot, with retry countdown) |

## Backend: Emitting Events

```typescript
// backend/src/services/meetingService.ts
import { io } from '../websocket';

export async function joinMeeting(meetingId: string, userId: string) {
  const participant = await db.addParticipant(meetingId, userId);
  const meeting = await db.getMeeting(meetingId);

  // Broadcast to meeting room
  io.to(`meeting:${meetingId}`).emit('participant:joined', {
    meetingId,
    participant: {
      id: participant.id,
      name: participant.name,
      avatarUrl: participant.avatarUrl,
      joinedAt: participant.createdAt,
    },
  });

  // Also emit updated meeting for participant count
  io.to(`meeting:${meetingId}`).emit('meeting:updated', meeting);

  return meeting;
}
```

## Testing Real-Time

### Backend Tests
```typescript
// Use socket.io-client in tests
import { io } from 'socket.io-client';

test('emits participant:joined when user joins meeting', async () => {
  const socket = io(`http://localhost:${port}`);
  const meetingId = await createTestMeeting();

  const eventPromise = new Promise((resolve) => {
    socket.on('participant:joined', resolve);
  });

  socket.emit('meeting:subscribe', { meetingId });
  await api.post(`/api/meetings/${meetingId}/join`);

  const event = await eventPromise;
  expect(event.meetingId).toBe(meetingId);
});
```

### Frontend Tests
```typescript
// Mock socket.io-client for unit tests
// Use Playwright with real backend for E2E realtime tests
```
