import { useState, useEffect, useCallback } from 'react';
import {
  getMeetings,
  getMeeting,
  createMeeting as apiCreateMeeting,
  updateMeeting as apiUpdateMeeting,
  deleteMeeting as apiDeleteMeeting,
  joinMeeting as apiJoinMeeting,
  leaveMeeting as apiLeaveMeeting,
  getMyMeetings,
  type CreateMeetingInput,
  type UpdateMeetingInput,
  type MeetingListResponse,
} from '../api/meetings';
import type { Meeting, MeetingResponse } from '../types';

// ---- Query hooks ----

export function useMeetingList(params?: Record<string, string | number>) {
  const [data, setData] = useState<MeetingListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMeetings(params);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  }, [params?.page, params?.search, params?.status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, meetings: data?.meetings ?? [], isLoading, error, refetch: fetch };
}

export function useMeeting(id: string | undefined) {
  const [data, setData] = useState<MeetingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getMeeting(id)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load meeting'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const setMeeting = useCallback((meeting: MeetingResponse) => setData(meeting), []);

  return { meeting: data, isLoading, error, setMeeting };
}

export function useMyMeetings() {
  const [hosting, setHosting] = useState<Meeting[]>([]);
  const [attending, setAttending] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyMeetings();
      setHosting(result.hosting);
      setAttending(result.attending);
    } catch (err: any) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { hosting, attending, isLoading, error, refetch: fetch };
}

// ---- Mutation hooks ----

export function useCreateMeeting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: CreateMeetingInput): Promise<Meeting> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiCreateMeeting(data);
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { create, isLoading, error };
}

export function useUpdateMeeting() {
  const [isLoading, setIsLoading] = useState(false);

  const update = useCallback(async (id: string, data: UpdateMeetingInput): Promise<Meeting> => {
    setIsLoading(true);
    try {
      return await apiUpdateMeeting(id, data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { update, isLoading };
}

export function useDeleteMeeting() {
  const [isLoading, setIsLoading] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await apiDeleteMeeting(id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { remove, isLoading };
}

export function useJoinMeeting() {
  const [isLoading, setIsLoading] = useState(false);

  const join = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      return await apiJoinMeeting(id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { join, isLoading };
}

export function useLeaveMeeting() {
  const [isLoading, setIsLoading] = useState(false);

  const leave = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      return await apiLeaveMeeting(id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { leave, isLoading };
}
