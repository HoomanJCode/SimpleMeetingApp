import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { getMeeting } from '../api/meetings';
import type { MeetingResponse } from '../types';

type ConnectionState = 'connected' | 'polling' | 'disconnected';

export function useRealtime(
  meetingId: string | undefined,
  setMeeting: (meeting: MeetingResponse) => void
) {
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const startPolling = useCallback(() => {
    if (!meetingId || pollTimerRef.current) return;
    setConnectionState('polling');
    pollTimerRef.current = setInterval(async () => {
      try {
        const { getMeeting } = await import('../api/meetings');
        const updated = await getMeeting(meetingId);
        setMeeting(updated);
      } catch { /* polling failure is silent */ }
    }, 5000);
  }, [meetingId, setMeeting]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!meetingId) return;

    const token = getToken();
    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnectionState('connected');
      stopPolling();
      socket.emit('meeting:subscribe', { meetingId });
    });

    socket.on('connect_error', () => {
      startPolling();
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
      startPolling();
    });

    socket.on('meeting:updated', (updated: MeetingResponse) => {
      setMeeting(updated);
    });

    socket.on('participant:joined', () => {
      getMeeting(meetingId).then(setMeeting);
    });

    socket.on('participant:left', () => {
      getMeeting(meetingId).then(setMeeting);
    });

    socket.on('meeting:deleted', () => {
      setConnectionState('disconnected');
      window.location.href = '/';
    });

    socket.on('meeting:cancelled', () => {
      getMeeting(meetingId).then(setMeeting);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('meeting:unsubscribe', { meetingId });
      socket.disconnect();
      stopPolling();
    };
  }, [meetingId, getToken, setMeeting, startPolling, stopPolling]);

  return { connectionState };
}
