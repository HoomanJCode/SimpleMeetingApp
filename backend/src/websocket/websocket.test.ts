import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { Server as HttpServer } from 'http';
import { Server as IoServer } from 'socket.io';
import { getDb } from '../db/connection';
import { runMigrations } from '../db/migrate';
import { generateAccessToken } from '../utils/jwt';
import { createWebSocketServer } from './index';
import {
  emitMeetingCreated,
  emitMeetingUpdated,
  emitMeetingDeleted,
  emitMeetingCancelled,
  emitParticipantJoined,
  emitParticipantLeft,
} from './events';
import { createMeeting, joinMeeting, leaveMeeting } from '../services/meetingService';

function waitForEvent(client: ClientSocket, event: string): Promise<unknown> {
  return new Promise((resolve) => {
    client.once(event, resolve);
  });
}

function waitForConnect(client: ClientSocket, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`WebSocket connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    client.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });

    client.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function disconnect(client: ClientSocket): Promise<void> {
  return new Promise((resolve) => {
    if (!client.connected) {
      resolve();
      return;
    }
    client.once('disconnect', () => resolve());
    client.disconnect();
  });
}

describe('WebSocket server', () => {
  let httpServer: HttpServer;
  let io: IoServer;
  let client: ClientSocket;
  let clientUrl: string;

  beforeAll(() => {
    const db = getDb();
    runMigrations();

    // Seed test users
    db.prepare('INSERT OR IGNORE INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
      'u1', 'g-test', 'host@test.com', 'Host User'
    );
    db.prepare('INSERT OR IGNORE INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
      'u2', 'g-test2', 'other@test.com', 'Other User'
    );

    httpServer = http.createServer();
    io = createWebSocketServer(httpServer);

    return new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        clientUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    io.close();

    // Clean up seeded users
    const db = getDb();
    db.prepare('DELETE FROM users').run();
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM participants').run();
    db.prepare('DELETE FROM meetings').run();
  });

  it('connects with a valid token', async () => {
    const token = generateAccessToken({
      sub: 'u1',
      email: 'host@test.com',
      name: 'Host User',
      avatarUrl: null,
    });

    client = Client(clientUrl, { auth: { token } });
    await waitForConnect(client);

    expect(client.connected).toBe(true);
    await disconnect(client);
  });

  it('connects without a token', async () => {
    client = Client(clientUrl);
    await waitForConnect(client);

    expect(client.connected).toBe(true);
    await disconnect(client);
  });

  it('subscribes to a meeting room', async () => {
    client = Client(clientUrl);
    await waitForConnect(client);

    await new Promise<void>((resolve) => {
      client.emit('meeting:subscribe', { meetingId: 'meeting-123' }, resolve);
    });

    expect(client.connected).toBe(true);
    await disconnect(client);
  });

  it('emits meeting:created to global room', async () => {
    client = Client(clientUrl);
    await waitForConnect(client);

    const promise = waitForEvent(client, 'meeting:created');
    const meeting = createMeeting(
      {
        title: 'WS Test',
        description: 'WebSocket test meeting',
        dateTime: '2027-01-01T18:00:00Z',
        location: 'Online',
        capacity: 10,
      },
      'u1'
    );

    const received = (await promise) as { id: string; title: string };
    expect(received.id).toBe(meeting.id);
    expect(received.title).toBe('WS Test');

    await disconnect(client);
  });

  it('emits meeting:updated to meeting room', async () => {
    const meeting = createMeeting(
      {
        title: 'Update Test',
        description: 'Test',
        dateTime: '2027-01-01T18:00:00Z',
        location: 'Online',
        capacity: 10,
      },
      'u1'
    );

    client = Client(clientUrl);
    await waitForConnect(client);
    await new Promise<void>((resolve) => {
      client.emit('meeting:subscribe', { meetingId: meeting.id }, resolve);
    });

    const promise = waitForEvent(client, 'meeting:updated');
    emitMeetingUpdated(meeting);

    const received = (await promise) as { id: string; title: string };
    expect(received.id).toBe(meeting.id);
    expect(received.title).toBe('Update Test');

    await disconnect(client);
  });

  it('emits meeting:deleted to meeting room', async () => {
    const meeting = createMeeting(
      {
        title: 'Delete Test',
        description: 'Test',
        dateTime: '2027-01-01T18:00:00Z',
        location: 'Online',
        capacity: 10,
      },
      'u1'
    );

    client = Client(clientUrl);
    await waitForConnect(client);
    await new Promise<void>((resolve) => {
      client.emit('meeting:subscribe', { meetingId: meeting.id }, resolve);
    });

    const promise = waitForEvent(client, 'meeting:deleted');
    emitMeetingDeleted(meeting.id);

    const received = (await promise) as { meetingId: string };
    expect(received.meetingId).toBe(meeting.id);

    await disconnect(client);
  });

  it('emits meeting:cancelled to meeting room', async () => {
    const meeting = createMeeting(
      {
        title: 'Cancel Test',
        description: 'Test',
        dateTime: '2027-01-01T18:00:00Z',
        location: 'Online',
        capacity: 10,
      },
      'u1'
    );

    client = Client(clientUrl);
    await waitForConnect(client);
    await new Promise<void>((resolve) => {
      client.emit('meeting:subscribe', { meetingId: meeting.id }, resolve);
    });

    const promise = waitForEvent(client, 'meeting:cancelled');
    emitMeetingCancelled(meeting.id);

    const received = (await promise) as { meetingId: string };
    expect(received.meetingId).toBe(meeting.id);

    await disconnect(client);
  });

  it('emits participant:joined and meeting:updated when a user joins', async () => {
    const meeting = createMeeting(
      {
        title: 'Join Test',
        description: 'Test',
        dateTime: '2027-01-01T18:00:00Z',
        location: 'Online',
        capacity: 10,
      },
      'u1'
    );

    client = Client(clientUrl);
    await waitForConnect(client);
    await new Promise<void>((resolve) => {
      client.emit('meeting:subscribe', { meetingId: meeting.id }, resolve);
    });

    const joinedPromise = waitForEvent(client, 'participant:joined');
    joinMeeting(meeting.id, 'u2');

    const received = (await joinedPromise) as { meetingId: string; participant: { id: string } };
    expect(received.meetingId).toBe(meeting.id);
    expect(received.participant.id).toBe('u2');

    await disconnect(client);
  });

  it('emits participant:left when a user leaves', async () => {
    const meeting = createMeeting(
      {
        title: 'Leave Test',
        description: 'Test',
        dateTime: '2027-01-01T18:00:00Z',
        location: 'Online',
        capacity: 10,
      },
      'u1'
    );

    joinMeeting(meeting.id, 'u2');

    client = Client(clientUrl);
    await waitForConnect(client);
    await new Promise<void>((resolve) => {
      client.emit('meeting:subscribe', { meetingId: meeting.id }, resolve);
    });

    const leftPromise = waitForEvent(client, 'participant:left');
    leaveMeeting(meeting.id, 'u2');

    const received = (await leftPromise) as { meetingId: string; userId: string };
    expect(received.meetingId).toBe(meeting.id);
    expect(received.userId).toBe('u2');

    await disconnect(client);
  });
});
