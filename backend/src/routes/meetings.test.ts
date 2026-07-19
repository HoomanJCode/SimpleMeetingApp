import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { getDb } from '../db/connection';
import { runMigrations } from '../db/migrate';
import { generateAccessToken } from '../utils/jwt';
import type { JwtPayload } from '../types/models';

const hostPayload: JwtPayload = {
  sub: 'u1',
  email: 'host@test.com',
  name: 'Host User',
  avatarUrl: null,
};

const otherPayload: JwtPayload = {
  sub: 'u2',
  email: 'other@test.com',
  name: 'Other User',
  avatarUrl: null,
};

const hostToken = generateAccessToken(hostPayload);
const otherToken = generateAccessToken(otherPayload);

beforeAll(() => {
  const db = getDb();
  runMigrations();

  // Seed test users
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get('u1');
  if (!existing) {
    db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
      'u1', 'g1', 'host@test.com', 'Host User'
    );
    db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
      'u2', 'g2', 'other@test.com', 'Other User'
    );
  }
});

beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM participants').run();
  db.prepare('DELETE FROM meetings').run();
});

function validMeeting() {
  return {
    title: 'Test Meeting',
    description: 'A test meeting description',
    dateTime: '2028-01-01T18:00:00Z',
    location: 'Conference Room A',
    capacity: 20,
  };
}

describe('Meeting API', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/meetings', () => {
    it('returns an empty list when no meetings exist', async () => {
      const res = await request(app).get('/api/meetings').expect(200);
      expect(res.body.meetings).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('lists created meetings with pagination', async () => {
      // Create a meeting first via API
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app).get('/api/meetings').expect(200);
      expect(res.body.meetings).toHaveLength(1);
      expect(res.body.meetings[0].title).toBe('Test Meeting');
      expect(res.body.pagination.total).toBe(1);
    });

    it('filters meetings by search query', async () => {
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app).get('/api/meetings?search=Test').expect(200);
      expect(res.body.meetings).toHaveLength(1);

      const empty = await request(app).get('/api/meetings?search=Nothing').expect(200);
      expect(empty.body.meetings).toHaveLength(0);
    });
  });

  describe('POST /api/meetings', () => {
    it('creates a meeting when authenticated', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Meeting');
      expect(res.body.hostId).toBe('u1');
      expect(res.body.status).toBe('upcoming');
      expect(res.body.participantCount).toBe(1);
    });

    it('returns 401 when not authenticated', async () => {
      await request(app)
        .post('/api/meetings')
        .send(validMeeting())
        .expect(401);
    });

    it('returns 400 for invalid data', async () => {
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('GET /api/meetings/:id', () => {
    it('returns meeting details with host info and participant list', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app).get(`/api/meetings/${created.body.id}`).expect(200);

      expect(res.body.title).toBe('Test Meeting');
      expect(res.body.hostName).toBe('Host User');
      expect(res.body.participants).toHaveLength(1);
    });

    it('returns 404 for non-existent meeting', async () => {
      await request(app).get('/api/meetings/non-existent-id').expect(404);
    });

    it('includes isJoined when authenticated and joined', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      // Host should see isJoined=true
      const res = await request(app)
        .get(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(res.body.isJoined).toBe(true);
    });
  });

  describe('PUT /api/meetings/:id', () => {
    it('updates meeting when host', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app)
        .put(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
    });

    it('returns 403 when non-host tries to update', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .put(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);
    });

    it('returns 401 when not authenticated', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .put(`/api/meetings/${created.body.id}`)
        .send({ title: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('DELETE /api/meetings/:id', () => {
    it('deletes meeting when host', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .delete(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(204);

      // Verify it's gone
      await request(app).get(`/api/meetings/${created.body.id}`).expect(404);
    });

    it('returns 403 when non-host tries to delete', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .delete(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('POST /api/meetings/:id/join', () => {
    it('allows a user to join a meeting', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      const res = await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(res.body.participantCount).toBe(2);
    });

    it('returns 409 when already joined', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      // Join once (host already joined, but other user hasn't)
      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      // Try joining again
      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(409);
    });

    it('returns 409 when meeting is full', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ ...validMeeting(), capacity: 2 })
        .expect(201);

      // Host takes slot 1, other user takes slot 2 — meeting is full
      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      // Third user tries to join full meeting
      const thirdPayload = { sub: 'u3', email: 'third@test.com', name: 'Third User', avatarUrl: null };
      const thirdToken = generateAccessToken(thirdPayload);

      // Make sure u3 exists in DB
      const db = getDb();
      const existing = db.prepare('SELECT id FROM users WHERE id = ?').get('u3');
      if (!existing) {
        db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
          'u3', 'g3', 'third@test.com', 'Third User'
        );
      }

      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${thirdToken}`)
        .expect(409);
    });
  });

  describe('POST /api/meetings/:id/leave', () => {
    it('allows a participant to leave', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      // Other user joins
      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      // Then leaves
      const res = await request(app)
        .post(`/api/meetings/${created.body.id}/leave`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(res.body.participantCount).toBe(1);
    });

    it('returns 409 when host tries to leave', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .post(`/api/meetings/${created.body.id}/leave`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(409);
    });

    it('returns 409 when not a participant', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      await request(app)
        .post(`/api/meetings/${created.body.id}/leave`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(409);
    });
  });

  describe('GET /api/meetings/my', () => {
    it('returns hosting and attending meetings for the user', async () => {
      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validMeeting())
        .expect(201);

      // Other user joins
      await request(app)
        .post(`/api/meetings/${created.body.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      // Host: should see 1 hosting
      const hostRes = await request(app)
        .get('/api/meetings/my')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(hostRes.body.hosting).toHaveLength(1);
      expect(hostRes.body.attending).toHaveLength(0);

      // Other: should see 1 attending
      const otherRes = await request(app)
        .get('/api/meetings/my')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(otherRes.body.attending).toHaveLength(1);
    });

    it('returns 401 when not authenticated', async () => {
      await request(app).get('/api/meetings/my').expect(401);
    });
  });
});
