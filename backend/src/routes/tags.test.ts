import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { getDb } from '../db/connection';
import { runMigrations } from '../db/migrate';
import { generateAccessToken } from '../utils/jwt';
import type { JwtPayload, Tag } from '../types/models';

const hostPayload: JwtPayload = {
  sub: 'u1',
  email: 'host@test.com',
  name: 'Host User',
  avatarUrl: null,
};
const hostToken = generateAccessToken(hostPayload);

beforeAll(() => {
  const db = getDb();
  runMigrations();

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get('u1');
  if (!existing) {
    db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
      'u1', 'g1', 'host@test.com', 'Host User'
    );
  }
});

beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM meeting_tags').run();
  db.prepare('DELETE FROM meeting_photos').run();
  db.prepare('DELETE FROM participants').run();
  db.prepare('DELETE FROM meetings').run();
});

function validMeeting() {
  return {
    title: 'Tagged Meeting',
    description: 'A meeting with tags for testing',
    dateTime: '2028-01-01T18:00:00Z',
    location: 'Room A',
    capacity: 20,
  };
}

async function tagIdByName(name: string, app: ReturnType<typeof createApp>): Promise<string> {
  const res = await request(app).get('/api/tags').expect(200);
  const tag = (res.body.tags as Tag[]).find((t) => t.name === name);
  expect(tag).toBeDefined();
  return tag!.id;
}

describe('Tags API', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/tags', () => {
    it('returns the seeded default tags', async () => {
      const res = await request(app).get('/api/tags').expect(200);
      expect(res.body.tags.length).toBeGreaterThanOrEqual(6);
      for (const tag of res.body.tags as Tag[]) {
        expect(tag.id).toBeDefined();
        expect(tag.name).toBeDefined();
        expect(tag.color).toBeDefined();
      }
    });
  });

  describe('tags on meetings', () => {
    it('creates a meeting with tags and returns them', async () => {
      const techId = await tagIdByName('Tech Talk', app);
      const onlineId = await tagIdByName('Online', app);

      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ ...validMeeting(), tagIds: [techId, onlineId] })
        .expect(201);

      const names = (res.body.tags as Tag[]).map((t) => t.name).sort();
      expect(names).toEqual(['Online', 'Tech Talk']);
    });

    it('filters meetings by tag', async () => {
      const techId = await tagIdByName('Tech Talk', app);
      const socialId = await tagIdByName('Social', app);

      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ ...validMeeting(), title: 'Tech Meetup', tagIds: [techId] })
        .expect(201);

      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ ...validMeeting(), title: 'Social Meetup', tagIds: [socialId] })
        .expect(201);

      const res = await request(app).get(`/api/meetings?tagId=${techId}`).expect(200);
      expect(res.body.meetings).toHaveLength(1);
      expect(res.body.meetings[0].title).toBe('Tech Meetup');
    });

    it('updates tags on a meeting', async () => {
      const techId = await tagIdByName('Tech Talk', app);
      const urgentId = await tagIdByName('Urgent', app);

      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ ...validMeeting(), tagIds: [techId] })
        .expect(201);

      expect(created.body.tags).toHaveLength(1);

      const updated = await request(app)
        .put(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ tagIds: [urgentId] })
        .expect(200);

      expect(updated.body.tags).toHaveLength(1);
      expect(updated.body.tags[0].name).toBe('Urgent');
    });

    it('clears tags when tagIds is an empty array', async () => {
      const techId = await tagIdByName('Tech Talk', app);

      const created = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ ...validMeeting(), tagIds: [techId] })
        .expect(201);

      const updated = await request(app)
        .put(`/api/meetings/${created.body.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ tagIds: [] })
        .expect(200);

      expect(updated.body.tags).toHaveLength(0);
    });
  });
});
