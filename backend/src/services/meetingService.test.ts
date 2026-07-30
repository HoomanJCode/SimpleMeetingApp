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
  updateMeeting,
  cancelMeeting,
  getMeetingByIdWithPhotos,
  getMeetingPhotos,
  addMeetingPhoto,
  deleteMeetingPhoto,
} from './meetingService';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

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

    it('creates a meeting with a coverPhotoUrl', () => {
      const meeting = createMeeting({
        title: 'Cover Photo Meeting',
        description: 'Meeting with a cover photo',
        dateTime: '2027-06-01T18:00:00Z',
        location: 'Park',
        capacity: 15,
        coverPhotoUrl: 'https://example.com/cover.jpg',
      }, hostId);

      expect(meeting.coverPhotoUrl).toBe('https://example.com/cover.jpg');
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

  describe('updateMeeting', () => {
    it('updates the coverPhotoUrl on a meeting', () => {
      const meeting = createMeeting({ title: 'Photo Test', description: 'Testing cover photo', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      const updated = updateMeeting(meeting.id, hostId, { coverPhotoUrl: 'https://example.com/cover.jpg' });
      expect(updated.coverPhotoUrl).toBe('https://example.com/cover.jpg');
    });

    it('removes the coverPhotoUrl when set to null', () => {
      const meeting = createMeeting({ title: 'Cover Remove', description: 'Testing cover removal', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10, coverPhotoUrl: 'https://example.com/cover.jpg' }, hostId);
      expect(meeting.coverPhotoUrl).toBe('https://example.com/cover.jpg');

      const updated = updateMeeting(meeting.id, hostId, { coverPhotoUrl: null });
      expect(updated.coverPhotoUrl).toBeNull();
    });

    it('throws ForbiddenError when non-host tries to update', () => {
      const meeting = createMeeting({ title: 'Forbidden', description: 'Non-host update', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      expect(() => updateMeeting(meeting.id, otherUserId, { title: 'Hacked' })).toThrow(ForbiddenError);
    });

    it('throws NotFoundError when meeting does not exist', () => {
      expect(() => updateMeeting('nonexistent', hostId, { title: 'X' })).toThrow(NotFoundError);
    });
  });

  describe('cancelMeeting', () => {
    it('cancels a meeting by setting status to cancelled', () => {
      const meeting = createMeeting({ title: 'Cancel Test', description: 'Testing cancel', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      const cancelled = cancelMeeting(meeting.id, hostId);
      expect(cancelled.status).toBe('cancelled');
    });

    it('throws NotFoundError when meeting does not exist', () => {
      expect(() => cancelMeeting('nonexistent', hostId)).toThrow(NotFoundError);
    });

    it('throws ForbiddenError when non-host tries to cancel', () => {
      const meeting = createMeeting({ title: 'Forbid Cancel', description: 'Non-host cancel', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      expect(() => cancelMeeting(meeting.id, otherUserId)).toThrow(ForbiddenError);
    });

    it('throws ConflictError when already cancelled', () => {
      const meeting = createMeeting({ title: 'Double Cancel', description: 'Already cancelled', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);
      cancelMeeting(meeting.id, hostId);

      expect(() => cancelMeeting(meeting.id, hostId)).toThrow(ConflictError);
    });
  });

  describe('getMeetingPhotos', () => {
    it('returns an empty array when no photos exist', () => {
      const meeting = createMeeting({ title: 'No Photos', description: 'Meeting with no photos', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      const photos = getMeetingPhotos(meeting.id);
      expect(photos).toEqual([]);
    });

    it('returns photos after they are added', () => {
      const meeting = createMeeting({ title: 'With Photos', description: 'Meeting with photos', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      addMeetingPhoto(meeting.id, hostId, 'https://example.com/photo1.jpg');
      addMeetingPhoto(meeting.id, hostId, 'https://example.com/photo2.jpg');

      const photos = getMeetingPhotos(meeting.id);
      expect(photos).toHaveLength(2);
      expect(photos[0].url).toBe('https://example.com/photo1.jpg');
      expect(photos[1].url).toBe('https://example.com/photo2.jpg');
    });
  });

  describe('addMeetingPhoto', () => {
    it('adds a photo and returns the photo object', () => {
      const meeting = createMeeting({ title: 'Add Photo', description: 'Adding a photo', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      const photo = addMeetingPhoto(meeting.id, hostId, 'https://example.com/new.jpg');
      expect(photo.id).toBeDefined();
      expect(photo.meetingId).toBe(meeting.id);
      expect(photo.url).toBe('https://example.com/new.jpg');
      expect(photo.createdAt).toBeDefined();
    });

    it('throws NotFoundError when meeting does not exist', () => {
      expect(() => addMeetingPhoto('nonexistent', hostId, 'https://example.com/photo.jpg')).toThrow(NotFoundError);
    });

    it('throws ForbiddenError when non-host tries to add a photo', () => {
      const meeting = createMeeting({ title: 'Forbid Photo', description: 'Non-host photo add', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      expect(() => addMeetingPhoto(meeting.id, otherUserId, 'https://example.com/photo.jpg')).toThrow(ForbiddenError);
    });
  });

  describe('deleteMeetingPhoto', () => {
    it('deletes a photo and returns its URL', () => {
      const meeting = createMeeting({ title: 'Delete Photo', description: 'Deleting a photo', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);
      const photo = addMeetingPhoto(meeting.id, hostId, 'https://example.com/to-delete.jpg');

      const result = deleteMeetingPhoto(meeting.id, photo.id, hostId);
      expect(result.url).toBe('https://example.com/to-delete.jpg');

      // Verify it's gone
      const photos = getMeetingPhotos(meeting.id);
      expect(photos).toHaveLength(0);
    });

    it('throws NotFoundError when meeting does not exist', () => {
      expect(() => deleteMeetingPhoto('nonexistent', 'photo1', hostId)).toThrow(NotFoundError);
    });

    it('throws ForbiddenError when non-host tries to delete a photo', () => {
      const meeting = createMeeting({ title: 'Forbid Delete', description: 'Non-host photo delete', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);
      const photo = addMeetingPhoto(meeting.id, hostId, 'https://example.com/photo.jpg');

      expect(() => deleteMeetingPhoto(meeting.id, photo.id, otherUserId)).toThrow(ForbiddenError);
    });

    it('throws NotFoundError when photo does not exist', () => {
      const meeting = createMeeting({ title: 'No Such Photo', description: 'Photo not found', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      expect(() => deleteMeetingPhoto(meeting.id, 'nonexistent-photo', hostId)).toThrow(NotFoundError);
    });
  });

  describe('getMeetingByIdWithPhotos', () => {
    it('returns a meeting with an empty photos array when no photos', () => {
      const meeting = createMeeting({ title: 'Full Detail', description: 'Meeting with no photos yet', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);

      const result = getMeetingByIdWithPhotos(meeting.id);
      expect(result.photos).toEqual([]);
    });

    it('returns a meeting with its photos', () => {
      const meeting = createMeeting({ title: 'With Gallery', description: 'Meeting with gallery', dateTime: '2027-01-01T18:00:00Z', location: 'L', capacity: 10 }, hostId);
      addMeetingPhoto(meeting.id, hostId, 'https://example.com/g1.jpg');
      addMeetingPhoto(meeting.id, hostId, 'https://example.com/g2.jpg');

      const result = getMeetingByIdWithPhotos(meeting.id);
      expect(result.photos).toHaveLength(2);
    });

    it('throws NotFoundError when meeting does not exist', () => {
      expect(() => getMeetingByIdWithPhotos('nonexistent')).toThrow(NotFoundError);
    });
  });
});
