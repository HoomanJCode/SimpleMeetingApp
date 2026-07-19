import { getIO } from './index';
import { Meeting } from '../types/models';
import { logger } from '../utils/logger';

/**
 * Broadcasts a new meeting to all connected clients.
 */
export function emitMeetingCreated(meeting: Meeting): void {
  const io = getIO();
  io.to('global').emit('meeting:created', meeting);
  logger.debug({ meetingId: meeting.id }, 'Emitted meeting:created');
}

/**
 * Broadcasts meeting update to clients in the meeting room.
 */
export function emitMeetingUpdated(meeting: Meeting): void {
  const io = getIO();
  io.to(`meeting:${meeting.id}`).emit('meeting:updated', meeting);
  logger.debug({ meetingId: meeting.id }, 'Emitted meeting:updated');
}

/**
 * Broadcasts meeting deletion to global and meeting room.
 */
export function emitMeetingDeleted(meetingId: string): void {
  const io = getIO();
  io.to('global').emit('meeting:deleted', { meetingId });
  io.to(`meeting:${meetingId}`).emit('meeting:deleted', { meetingId });
  logger.debug({ meetingId }, 'Emitted meeting:deleted');
}

/**
 * Broadcasts meeting cancellation to the meeting room.
 */
export function emitMeetingCancelled(meetingId: string): void {
  const io = getIO();
  io.to(`meeting:${meetingId}`).emit('meeting:cancelled', { meetingId });
  logger.debug({ meetingId }, 'Emitted meeting:cancelled');
}

/**
 * Broadcasts a new participant to the meeting room.
 */
export function emitParticipantJoined(
  meetingId: string,
  participant: { id: string; name: string; avatarUrl: string | null; joinedAt: string }
): void {
  const io = getIO();
  io.to(`meeting:${meetingId}`).emit('participant:joined', {
    meetingId,
    participant,
  });
  logger.debug({ meetingId, userId: participant.id }, 'Emitted participant:joined');
}

/**
 * Broadcasts a participant leaving to the meeting room.
 */
export function emitParticipantLeft(meetingId: string, userId: string): void {
  const io = getIO();
  io.to(`meeting:${meetingId}`).emit('participant:left', {
    meetingId,
    userId,
  });
  logger.debug({ meetingId, userId }, 'Emitted participant:left');
}
