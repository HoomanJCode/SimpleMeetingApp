import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { getDb } from '../src/db/connection';
import { generateAccessToken } from '../src/utils/jwt';

const hostId = 'meeting-int-host';
const otherId = 'meeting-int-other';

beforeAll(() => {
  runMigrations();

  const db = getDb();
  for (const user of [
    { id: hostId, googleId: 'g-host', email: 'host@example.com', name: 'Host User' },
    { id: otherId, googleId: 'g-other', email: 'other@example.com', name: 'Other User' },
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

const otherToken = () =>
  generateAccessToken({
    sub: otherId,
    email: 'other@example.com',
    name: 'Other User',
    avatarUrl: null,
  });

function validMeeting() {
  return {
    title: 'Integration Meeting',
    description: 'A meeting for integration tests',
    dateTime: '2028-06-15T10:00:00Z',
    location: 'Room 101',
    capacity: 10,
  };
}

const app = createApp();

describe('Meetings API integration', () => {
  describe('GET /api/meetings', () => {
    it('returns a paginated list of meetings', async () => {
      const res = await request(app).get('/api/meetings').expect(200);
      expect(res.body.meetings).toEqual([]);
      expect(res.body.pagination).toMatchObject({ total: 0, page: 1 });
    });

    it('filters meetings by search query', async () => {
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app).get('/api/meetings?search=Integration').expect(200);
      expect(res.body.meetings).toHaveLength(1);

      const empty = await request(app).get('/api/meetings?search=NothingHere').expect(200);
      expect(empty.body.meetings).toHaveLength(0);
    });
  });

  describe('POST /api/meetings', () => {
    it('creates a meeting when authenticated', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      expect(res.body.title).toBe('Integration Meeting');
      expect(res.body.hostId).toBe(hostId);
    });

    it('returns 401 when not authenticated', async () => {
      await request(app).post('/api/meetings').send(validMeeting()).expect(401);
    });

    it('returns 400 for invalid data', async () => {
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('GET /api/meetings/:id', () => {
    it('returns meeting details for an existing meeting', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app).get(`/api/meetings/${created.body.id}`).expect(200);
      expect(res.body.title).toBe('Integration Meeting');
    });

    it('returns 404 for a non-existent meeting', async () => {
      await request(app).get('/api/meetings/does-not-exist').expect(404);
    });
  });

  describe('PUT /api/meetings/:id', () => {
    it('updates the meeting when the host requests it', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app)
        .put(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${hostToken()}`)
        .send({ title: 'Updated Integration Meeting' })
        .expect(200);

      expect(res.body.title).toBe('Updated Integration Meeting');
    });

    it('returns 403 when a non-host tries to update', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .put(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${otherToken()}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('POST /api/meetings/:id/cancel', () => {
    it('cancels the meeting when the host requests it', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app)
        .post(`/api/meetings/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${hostToken()}`)
        .expect(200);

      expect(res.body.status).toBe('cancelled');

      const getRes = await request(app).get(`/api/meetings/${created.body.id}`).expect(200);
      expect(getRes.body.status).toBe('cancelled');
    });

    it('returns 403 when a non-host tries to cancel', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken()}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .post(`/api/meetings/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${otherToken()}`)
        .expect(403);
    });
  });
});
