import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { getDb } from '../src/db/connection';
import { generateAccessToken } from '../src/utils/jwt';

const hostId = 'participant-int-host';
const participantId = 'participant-int-user';
const thirdId = 'participant-int-third';

beforeAll(() => {
  runMigrations();

  const db = getDb();
  for (const user of [
    { id: hostId, googleId: 'g-host', email: 'host@example.com', name: 'Host User' },
    { id: participantId, googleId: 'g-part', email: 'part@example.com', name: 'Participant User' },
    { id: thirdId, googleId: 'g-third', email: 'third@example.com', name: 'Third User' },
  ]) {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id);
    if (!existing) {
      db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
        user.id,
        user.googleId,
        user.email,
        user.name
      );
    }
  }
});

beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM participants').run();
  db.prepare('DELETE FROM meetings').run();
});

const hostToken = () =>
  generateAccessToken({
    sub: hostId,
    email: 'host@example.com',
    name: 'Host User',
    avatarUrl: null,
  });

const participantToken = () =>
  generateAccessToken({
    sub: participantId,
    email: 'part@example.com',
    name: 'Participant User',
    avatarUrl: null,
  });

const thirdToken = () =>
  generateAccessToken({
    sub: thirdId,
    email: 'third@example.com',
    name: 'Third User',
    avatarUrl: null,
  });

function validMeeting(capacity = 3) {
  return {
    title: 'Participant Test Meeting',
    description: 'For join/leave tests',
    dateTime: '2028-07-20T14:00:00Z',
    location: 'Room A',
    capacity,
  };
}

const app = createApp();

describe('Participants API integration', () => {
  describe('POST /api/meetings/:id/join', () => {
    it('allows a user to join a meeting', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${participantToken()}`)
        .expect(200);

      expect(res.body.participantCount).toBe(2);
    });

    it('returns 409 when already joined', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${participantToken()}`)
        .expect(200);

      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${participantToken()}`)
        .expect(409);
    });

    it('returns 409 when the meeting is full', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting(2))
        .expect(201);

      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${participantToken()}`)
        .expect(200);

      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${thirdToken()}`)
        .expect(409);
    });
  });

  describe('POST /api/meetings/:id/leave', () => {
    it('allows a participant to leave', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${participantToken()}`)
        .expect(200);

      const res = await request(app)
        .post(`/api/meetings/${created.body.id}/leave`)
        .set('Authorization', `Bearer ${participantToken()}`)
        .expect(200);

      expect(res.body.participantCount).toBe(1);
    });

    it('returns 409 when not a participant', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .post(`/api/meetings/${created.body.id}/leave`)
        .set('Authorization', `Bearer ${participantToken()}`)
        .expect(409);
    });
  });
});
