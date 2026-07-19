import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getDb } from '../db/connection';
import { runMigrations } from '../db/migrate';
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  joinMeeting,
  leaveMeeting,
  getParticipants,
  getUserMeetings,
} from './meetingService';

const hostId = 'u1';
const otherUserId = 'u2';

beforeAll(() => {
  // Force a fresh in-memory database
  const db = getDb();
  runMigrations();

  // Seed test users
  db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
    'u1', 'g-test', 'host@test.com', 'Host User'
  );
  db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
    'u2', 'g-test2', 'other@test.com', 'Other User'
  );
});

beforeEach(() => {
  // Clean meetings and participants between tests
  const db = getDb();
  db.prepare('DELETE FROM participants').run();
  db.prepare('DELETE FROM meetings').run();
});

describe('MeetingService', () => {
  describe('createMeeting', () => {
    it('creates a meeting with the host as first participant', () => {
      const meeting = createMeeting({
        title: 'Test Meetup',
        description: 'A test meeting description',
        dateTime: '2027-01-01T18:00:00Z',
        location: 'Test Location',
        capacity: 20,
      }, hostId);

      expect(meeting.id).toBeDefined();
      expect(meeting.hostId).toBe(hostId);
      expect(meeting.title).toBe('Test Meetup');
      expect(meeting.status).toBe('upcoming');
      expect(meeting.participantCount).toBe(1);
      expect(meeting.isJoined).toBe(true);
    });
  });

  describe('getMeetings', () => {
    it('lists meetings with pagination', () => {
      createMeeting({ title: 'M1', description: 'Description for meeting 1', dateTime: '2027-01-01T18:00:00Z', location: 'L1', capacity: 10 }, hostId);
      createMeeting({ title: 'M2', description: 'Description for meeting 2', dateTime: '2027-02-01T18:00:00Z', location: 'L2', capacity: 10 }, hostId);

      const result = getMeetings({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('filters by search', () => {
      createMeeting({ title: 'React Meetup', description: 'React stuff', dateTime: '2027-01-01T18:00:00Z', location: 'X', capacity: 10 }, hostId);
      createMeeting({ title: 'Vue Meetup', description: 'Vue stuff', dateTime: '2027-02-01T18:00:00Z', location: 'Y', capacity: 10 }, hostId);

      const result = getMeetings({ search: 'React' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('React Meetup');
    });
  });

  describe('getMeetingById', () => {
    it('returns meeting with host info', () => {
      const created = createMeeting({ title: 'Test', description: 'A test meeting', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);
      const meeting = getMeetingById(created.id);

      expect(meeting.title).toBe('Test');
      expect(meeting.hostName).toBe('Host User');
      expect(meeting.participantCount).toBe(1);
    });
  });

  describe('joinMeeting / leaveMeeting', () => {
    it('allows a user to join and leave', () => {
      const meeting = createMeeting({ title: 'Join Test', description: 'Testing join and leave functionality', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 5 }, hostId);

      // Join
      const joined = joinMeeting(meeting.id, otherUserId);
      expect(joined.participantCount).toBe(2);

      // Leave
      const left = leaveMeeting(meeting.id, otherUserId);
      expect(left.participantCount).toBe(1);
    });
  });

  describe('getParticipants', () => {
    it('returns participants list', () => {
      const meeting = createMeeting({ title: 'P Test', description: 'Testing participants list', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);
      joinMeeting(meeting.id, otherUserId);

      const participants = getParticipants(meeting.id);
      expect(participants).toHaveLength(2);
      expect(participants.map(p => p.name)).toContain('Host User');
      expect(participants.map(p => p.name)).toContain('Other User');
    });
  });

  describe('getUserMeetings', () => {
    it('returns hosting and attending meetings', () => {
      const meeting = createMeeting({ title: 'Mine', description: 'My hosting meeting', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);
      joinMeeting(meeting.id, otherUserId);

      const hostMeetings = getUserMeetings(hostId);
      expect(hostMeetings.hosting).toHaveLength(1);
      expect(hostMeetings.hosting[0].title).toBe('Mine');

      const otherMeetings = getUserMeetings(otherUserId);
      expect(otherMeetings.attending).toHaveLength(1);
    });
  });
});
