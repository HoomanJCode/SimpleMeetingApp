import { getDb } from '../db/connection';
import { Meeting, MeetingFilters, PaginatedResult } from '../types/models';
import { CreateMeetingInput, UpdateMeetingInput } from './meetingSchemas';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  emitMeetingCreated,
  emitMeetingUpdated,
  emitMeetingDeleted,
  emitMeetingCancelled,
  emitParticipantJoined,
  emitParticipantLeft,
} from '../websocket/events';

// ---- DB row types (snake_case) ----

interface DbMeetingRow {
  id: string;
  host_id: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  capacity: number;
  status: string;
  created_at: string;
  updated_at: string;
  host_name?: string;
  host_avatar_url?: string | null;
  participant_count?: number;
}

interface DbParticipantRow {
  id: string;
  meeting_id: string;
  user_id: string;
  created_at: string;
  user_name?: string;
  user_avatar_url?: string | null;
}

// ---- Helpers ----

function mapDbMeeting(row: DbMeetingRow, userId?: string, isJoined?: boolean): Meeting {
  return {
    id: row.id,
    hostId: row.host_id,
    title: row.title,
    description: row.description,
    dateTime: row.date_time,
    location: row.location,
    capacity: row.capacity,
    status: row.status as Meeting['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hostName: row.host_name,
    hostAvatarUrl: row.host_avatar_url ?? null,
    participantCount: row.participant_count ?? 0,
    isJoined,
  };
}

// ---- Public API ----

/**
 * Creates a new meeting. The creating user becomes the host and first participant.
 */
export function createMeeting(data: CreateMeetingInput, hostId: string): Meeting {
  const db = getDb();

  const id = crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
  const now = new Date().toISOString();

  const insertMeeting = db.prepare(`
    INSERT INTO meetings (id, host_id, title, description, date_time, location, capacity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertParticipant = db.prepare(`
    INSERT INTO participants (meeting_id, user_id) VALUES (?, ?)
  `);

  // Get host info
  const host = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(hostId) as { name: string; avatar_url: string | null } | undefined;

  const transaction = db.transaction(() => {
    insertMeeting.run(id, hostId, data.title, data.description, data.dateTime, data.location, data.capacity, now, now);
    insertParticipant.run(id, hostId);
  });

  transaction();

  logger.info({ meetingId: id, hostId }, 'Meeting created');

  const meeting: Meeting = {
    id,
    hostId,
    title: data.title,
    description: data.description,
    dateTime: data.dateTime,
    location: data.location,
    capacity: data.capacity,
    status: 'upcoming',
    createdAt: now,
    updatedAt: now,
    hostName: host?.name,
    hostAvatarUrl: host?.avatar_url ?? null,
    participantCount: 1,
    isJoined: true,
  };

  // Broadcast to all connected clients
  try { emitMeetingCreated(meeting); } catch { /* WebSocket may not be initialized yet */ }

  return meeting;
}

/**
 * Lists meetings with optional filters and pagination.
 */
export function getMeetings(filters: MeetingFilters, userId?: string): PaginatedResult<Meeting> {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.search) {
    whereClause += ' AND m.title LIKE ?';
    params.push(`%${filters.search}%`);
  }

  if (filters.status) {
    whereClause += ' AND m.status = ?';
    params.push(filters.status);
  } else {
    // Default: show upcoming and ongoing
    whereClause += " AND m.status IN ('upcoming', 'ongoing')";
  }

  // Count total
  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM meetings m ${whereClause}`)
    .get(...params) as { total: number };

  // Fetch page
  const rows = db
    .prepare(`
      SELECT
        m.*,
        u.name as host_name,
        u.avatar_url as host_avatar_url,
        (SELECT COUNT(*) FROM participants WHERE meeting_id = m.id) as participant_count
      FROM meetings m
      JOIN users u ON u.id = m.host_id
      ${whereClause}
      ORDER BY m.date_time ASC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset) as DbMeetingRow[];

  return {
    data: rows.map((r) => mapDbMeeting(r)),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

/**
 * Gets a single meeting by ID, optionally with user-specific join status.
 */
export function getMeetingById(id: string, userId?: string): Meeting {
  const db = getDb();

  const row = db
    .prepare(`
      SELECT
        m.*,
        u.name as host_name,
        u.avatar_url as host_avatar_url,
        (SELECT COUNT(*) FROM participants WHERE meeting_id = m.id) as participant_count
      FROM meetings m
      JOIN users u ON u.id = m.host_id
      WHERE m.id = ?
    `)
    .get(id) as DbMeetingRow | undefined;

  if (!row) {
    throw new NotFoundError('Meeting');
  }

  let isJoined = false;
  if (userId) {
    const participant = db
      .prepare('SELECT 1 FROM participants WHERE meeting_id = ? AND user_id = ?')
      .get(id, userId);
    isJoined = !!participant;
  }

  return mapDbMeeting(row, userId, isJoined);
}

/**
 * Updates a meeting. Only the host can update.
 */
export function updateMeeting(id: string, userId: string, data: UpdateMeetingInput): Meeting {
  const db = getDb();

  const meeting = db.prepare('SELECT host_id FROM meetings WHERE id = ?').get(id) as { host_id: string } | undefined;

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  if (meeting.host_id !== userId) {
    throw new ForbiddenError('Only the host can update this meeting');
  }

  // Build dynamic SET clause
  const updates: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.dateTime !== undefined) {
    updates.push('date_time = ?');
    params.push(data.dateTime);
  }
  if (data.location !== undefined) {
    updates.push('location = ?');
    params.push(data.location);
  }
  if (data.capacity !== undefined) {
    updates.push('capacity = ?');
    params.push(data.capacity);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  if (updates.length === 0) {
    return getMeetingById(id, userId);
  }

  updates.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE meetings SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  logger.info({ meetingId: id, userId }, 'Meeting updated');

  const updatedMeeting = getMeetingById(id, userId);

  // Broadcast updates
  try {
    if (data.status === 'cancelled') {
      emitMeetingCancelled(id);
    }
    emitMeetingUpdated(updatedMeeting);
  } catch { /* WebSocket may not be initialized yet */ }

  return updatedMeeting;
}

/**
 * Deletes a meeting. Only the host can delete.
 */
export function deleteMeeting(id: string, userId: string): void {
  const db = getDb();

  const meeting = db.prepare('SELECT host_id FROM meetings WHERE id = ?').get(id) as { host_id: string } | undefined;

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  if (meeting.host_id !== userId) {
    throw new ForbiddenError('Only the host can delete this meeting');
  }

  db.prepare('DELETE FROM meetings WHERE id = ?').run(id);

  logger.info({ meetingId: id, userId }, 'Meeting deleted');

  // Broadcast deletion
  try { emitMeetingDeleted(id); } catch { /* WebSocket may not be initialized yet */ }
}

/**
 * Adds the current user as a participant to a meeting.
 */
export function joinMeeting(meetingId: string, userId: string): { participantCount: number } {
  const db = getDb();

  const meeting = db
    .prepare('SELECT host_id, capacity, status FROM meetings WHERE id = ?')
    .get(meetingId) as { host_id: string; capacity: number; status: string } | undefined;

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  if (meeting.status !== 'upcoming') {
    throw new ConflictError('Cannot join a meeting that is not upcoming');
  }

  // Check if already joined
  const existing = db
    .prepare('SELECT 1 FROM participants WHERE meeting_id = ? AND user_id = ?')
    .get(meetingId, userId);

  if (existing) {
    throw new ConflictError('Already joined this meeting');
  }

  // Check capacity
  const countRow = db
    .prepare('SELECT COUNT(*) as count FROM participants WHERE meeting_id = ?')
    .get(meetingId) as { count: number };

  if (countRow.count >= meeting.capacity) {
    throw new ConflictError('Meeting is at full capacity');
  }

  db.prepare('INSERT INTO participants (meeting_id, user_id) VALUES (?, ?)').run(meetingId, userId);

  const newCount = countRow.count + 1;

  logger.info({ meetingId, userId }, 'User joined meeting');

  // Broadcast participant joined
  try {
    const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(userId) as { name: string; avatar_url: string | null };
    emitParticipantJoined(meetingId, {
      id: userId,
      name: user?.name ?? 'Unknown',
      avatarUrl: user?.avatar_url ?? null,
      joinedAt: new Date().toISOString(),
    });
    const updated = getMeetingById(meetingId, userId);
    emitMeetingUpdated(updated);
  } catch { /* WebSocket may not be initialized yet */ }

  return { participantCount: newCount };
}

/**
 * Removes the current user from a meeting's participants.
 * Host cannot leave their own meeting.
 */
export function leaveMeeting(meetingId: string, userId: string): { participantCount: number } {
  const db = getDb();

  const meeting = db
    .prepare('SELECT host_id FROM meetings WHERE id = ?')
    .get(meetingId) as { host_id: string } | undefined;

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  if (meeting.host_id === userId) {
    throw new ConflictError('Host cannot leave their own meeting. Cancel or delete it instead.');
  }

  const result = db
    .prepare('DELETE FROM participants WHERE meeting_id = ? AND user_id = ?')
    .run(meetingId, userId);

  if (result.changes === 0) {
    throw new ConflictError('You are not a participant in this meeting');
  }

  const countRow = db
    .prepare('SELECT COUNT(*) as count FROM participants WHERE meeting_id = ?')
    .get(meetingId) as { count: number };

  logger.info({ meetingId, userId }, 'User left meeting');

  // Broadcast participant left
  try {
    emitParticipantLeft(meetingId, userId);
    const updated = getMeetingById(meetingId, userId);
    emitMeetingUpdated(updated);
  } catch { /* WebSocket may not be initialized yet */ }

  return { participantCount: countRow.count };
}

/**
 * Gets participants for a meeting.
 */
export function getParticipants(meetingId: string) {
  const db = getDb();

  const rows = db
    .prepare(`
      SELECT p.*, u.name as user_name, u.avatar_url as user_avatar_url
      FROM participants p
      JOIN users u ON u.id = p.user_id
      WHERE p.meeting_id = ?
      ORDER BY p.created_at ASC
    `)
    .all(meetingId) as DbParticipantRow[];

  return rows.map((r) => ({
    id: r.user_id,
    name: r.user_name,
    avatarUrl: r.user_avatar_url ?? null,
    joinedAt: r.created_at,
  }));
}

/**
 * Gets all meetings for a user (hosting and attending).
 */
export function getUserMeetings(userId: string) {
  const db = getDb();

  const hosting = db
    .prepare(`
      SELECT m.*, u.name as host_name, u.avatar_url as host_avatar_url,
        (SELECT COUNT(*) FROM participants WHERE meeting_id = m.id) as participant_count
      FROM meetings m
      JOIN users u ON u.id = m.host_id
      WHERE m.host_id = ?
      ORDER BY m.date_time DESC
    `)
    .all(userId) as DbMeetingRow[];

  const attending = db
    .prepare(`
      SELECT m.*, u.name as host_name, u.avatar_url as host_avatar_url,
        (SELECT COUNT(*) FROM participants WHERE meeting_id = m.id) as participant_count
      FROM meetings m
      JOIN users u ON u.id = m.host_id
      JOIN participants p ON p.meeting_id = m.id
      WHERE p.user_id = ? AND m.host_id != ?
      ORDER BY m.date_time DESC
    `)
    .all(userId, userId) as DbMeetingRow[];

  return {
    hosting: hosting.map((r) => mapDbMeeting(r, userId, true)),
    attending: attending.map((r) => mapDbMeeting(r, userId, true)),
  };
}
